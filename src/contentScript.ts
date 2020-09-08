import { browser } from 'webextension-polyfill-ts';
import { ApolloClient, gql } from '@apollo/client/core';
import { InMemoryCache } from '@apollo/client/cache';
import { createHttpLink } from '@apollo/client/link/http';
import { setContext } from '@apollo/client/link/context';
import { getConfig } from './config';

const createClient = (token: string) => {
  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        Authorization: token ? `Bearer ${token}` : null,
      },
    };
  });

  return new ApolloClient({
    link: authLink.concat(createHttpLink({ uri: 'https://api.github.com/graphql' })),
    cache: new InMemoryCache(),
  });
};

type Issue = {
  num: number;
  title: string;
  url: string;
  owner: string;
  repo: string;
};

const queryIssue = async <T>(
  client: ApolloClient<T>,
  owner: string,
  repo: string,
  num: number
): Promise<Issue> => {
  const result = await client.query({
    query: gql`
      query($owner: String!, $repo: String!, $num: Int!) {
        repository(name: $repo, owner: $owner) {
          id
          issue(number: $num) {
            id
            title
            url
          }
        }
      }
    `,
    variables: { owner, repo, num },
  });

  const { title, url } = result.data.repository.issue;
  return { num, title, url, owner, repo };
};

type PullRequest = Issue;

const queryPullRequest = async <T>(
  client: ApolloClient<T>,
  owner: string,
  repo: string,
  num: number
): Promise<PullRequest> => {
  const result = await client.query({
    query: gql`
      query($owner: String!, $repo: String!, $num: Int!) {
        repository(name: $repo, owner: $owner) {
          id
          pullRequest(number: $num) {
            id
            title
            url
          }
        }
      }
    `,
    variables: { owner, repo, num },
  });

  const { title, url } = result.data.repository.pullRequest;
  return { num, title, url, owner, repo };
};

const ghLogo64 = browser.runtime.getURL('images/GitHub-Mark-64px.png');
const ghLogo64Light = browser.runtime.getURL('images/GitHub-Mark-Light-64px.png');

const loadTemplates = async (): Promise<Document> => {
  const templateUrl = browser.runtime.getURL('template.html');
  const res = await fetch(templateUrl);
  const text = await res.text();
  const parser = new DOMParser();
  return parser.parseFromString(text, 'text/html');
};

const createCreateLink = (templates: Document, templateId: string) => {
  const template = templates.getElementById(templateId) as HTMLTemplateElement;
  const logoSrc = templateId == 'github-link-light' ? ghLogo64Light : ghLogo64;

  return (issue: Issue|PullRequest) => {
    const clone = document.importNode(template.content, true);
    const anchor = clone.querySelector('a') as HTMLAnchorElement;
    anchor.href = issue.url;
    const logo = clone.querySelector('img') as HTMLImageElement;
    logo.src = logoSrc;
    const title = clone.querySelector('.cwghe-title') as HTMLSpanElement;
    title.textContent = issue.title;
    const subTitle = clone.querySelector('.cwghe-sub-title') as HTMLSpanElement;
    subTitle.textContent = `${issue.owner}/${issue.repo}#${issue.num}`;

    return clone;
  };
};

const isAnchor = (elem: Node): elem is HTMLAnchorElement => {
  return (elem as HTMLAnchorElement).tagName?.toLowerCase() == 'a';
};

const init = async (): Promise<void> => {
  const observTargetId = 'root';
  const observTarget = document.getElementById(observTargetId);
  if (observTarget == null) {
    console.log('observe target not found.');
    return;
  }

  const config = await getConfig();
  if (config.token == '') {
    return;
  }
  const client = createClient(config.token);

  const templates = await loadTemplates();
  const createLink = createCreateLink(templates, `github-link-${config.theme}`);

  const observerConfig = { attributes: false, childList: true, subtree: true };

  const observer: MutationObserver = new MutationObserver(async (mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((elem: Node) => {
        if (isAnchor(elem) && elem.hostname == 'github.com') {
          if ('cwghe' in elem.dataset) {
            // Skip elements inserted by this extension.
            return;
          }

          // /owner/repository/(issues|pull)/num
          const [, owner, repo, resource, num] = elem.pathname.split('/');
          if (!num) {
            return;
          }

          if (resource != 'issues' && resource != 'pull') {
            return;
          }

          if (resource == 'issues') {
            elem.style.display = 'none';
            const parentElem = elem.parentElement;

            queryIssue(client, owner, repo, +num).then(async (issue: Issue) => {
              const node = createLink(issue);
              parentElem?.insertBefore(node, elem);
            });
          } else if (resource == 'pull') {
            elem.style.display = 'none';
            const parentElem = elem.parentElement;

            queryPullRequest(client, owner, repo, +num).then(async (pullRequest: PullRequest) => {
              const node = createLink(pullRequest);
              parentElem?.insertBefore(node, elem);
            });
          }
        }
      });
    });
  });

  observer.observe(observTarget, observerConfig);
};

init();
