import test from 'ava';
import nock from 'nock';
import {stub} from 'sinon';
import SemanticReleaseError from '@semantic-release/error';
import verify from '../lib/verify';
import authenticate from './helpers/mock-gitlab';

/* eslint camelcase: ["error", {properties: "never"}] */

// Save the current process.env
const envBackup = Object.assign({}, process.env);

test.beforeEach(t => {
  // Delete env variables in case they are on the machine running the tests
  delete process.env.GL_TOKEN;
  delete process.env.GITLAB_TOKEN;
  delete process.env.GL_URL;
  delete process.env.GITLAB_URL;
  delete process.env.GL_PREFIX;
  delete process.env.GITLAB_PREFIX;
  // Mock logger
  t.context.log = stub();
  t.context.error = stub();
  t.context.logger = {log: t.context.log, error: t.context.error};
});

test.afterEach.always(() => {
  // Restore process.env
  process.env = envBackup;
  // Clear nock
  nock.cleanAll();
});

test.serial('Verify token and repository access (project_access 30)', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  process.env.GL_TOKEN = 'gitlab_token';
  const gitlab = authenticate()
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 30}}});

  await t.notThrows(verify({}, {repositoryUrl: `git+https://gitalb.com/${owner}/${repo}.git`}, t.context.logger));
  t.true(gitlab.isDone());
});

test.serial('Verify token and repository access (project_access 40)', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  process.env.GL_TOKEN = 'gitlab_token';
  const gitlab = authenticate()
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrows(verify({}, {repositoryUrl: `git+https://gitalb.com/${owner}/${repo}.git`}, t.context.logger));
  t.true(gitlab.isDone());
});

test.serial('Verify token and repository access (group_access 30)', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  process.env.GL_TOKEN = 'gitlab_token';
  const gitlab = authenticate()
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 10}, group_access: {access_level: 30}}});

  await t.notThrows(verify({}, {repositoryUrl: `git+https://gitalb.com/${owner}/${repo}.git`}, t.context.logger));
  t.true(gitlab.isDone());
});

test.serial('Verify token and repository access (group_access 40)', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  process.env.GL_TOKEN = 'gitlab_token';
  const gitlab = authenticate()
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 10}, group_access: {access_level: 40}}});

  await t.notThrows(verify({}, {repositoryUrl: `git+https://gitalb.com/${owner}/${repo}.git`}, t.context.logger));
  t.true(gitlab.isDone());
});

test.serial('Verify token and repository access and custom URL', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  process.env.GL_TOKEN = 'gitlab_token';
  const gitlabUrl = 'https://othertesturl.com:9090';
  const gitlabApiPathPrefix = 'prefix';
  const gitlab = authenticate({gitlabUrl, gitlabApiPathPrefix})
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrows(
    verify(
      {gitlabUrl, gitlabApiPathPrefix},
      {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`},
      t.context.logger
    )
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], ['Verify GitLab authentication (%s)', 'https://othertesturl.com:9090/prefix']);
});

test.serial('Verify token and repository access with subgroup git URL', async t => {
  const repoUri = 'orga/subgroup/test_user/test_repo';
  process.env.GL_TOKEN = 'gitlab_token';
  const gitlabUrl = 'https://customurl.com:9090/context';
  const gitlabApiPathPrefix = 'prefix';
  const gitlab = authenticate({gitlabUrl, gitlabApiPathPrefix})
    .get(`/projects/${encodeURIComponent(repoUri)}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrows(
    verify({gitlabUrl, gitlabApiPathPrefix}, {repositoryUrl: `git@customurl.com:${repoUri}.git`}, t.context.logger)
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], [
    'Verify GitLab authentication (%s)',
    'https://customurl.com:9090/context/prefix',
  ]);
});

test.serial('Verify token and repository access with subgroup http URL', async t => {
  const repoUri = 'orga/subgroup/test_user/test_repo';
  process.env.GL_TOKEN = 'gitlab_token';
  const gitlabUrl = 'https://customurl.com:9090/context';
  const gitlabApiPathPrefix = 'prefix';
  const gitlab = authenticate({gitlabUrl, gitlabApiPathPrefix})
    .get(`/projects/${encodeURIComponent(repoUri)}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrows(
    verify({gitlabUrl, gitlabApiPathPrefix}, {repositoryUrl: `http://customurl.com/${repoUri}.git`}, t.context.logger)
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], [
    'Verify GitLab authentication (%s)',
    'https://customurl.com:9090/context/prefix',
  ]);
});

test.serial('Verify token and repository access with empty gitlabApiPathPrefix', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  process.env.GL_TOKEN = 'gitlab_token';
  const gitlabUrl = 'https://othertesturl.com:9090';
  const gitlabApiPathPrefix = '';
  const gitlab = authenticate({gitlabUrl, gitlabApiPathPrefix})
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrows(
    verify(
      {gitlabUrl, gitlabApiPathPrefix},
      {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`},
      t.context.logger
    )
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], ['Verify GitLab authentication (%s)', 'https://othertesturl.com:9090/']);
});

test.serial('Verify token and repository with environment variables', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  process.env.GL_URL = 'https://othertesturl.com:443';
  process.env.GL_TOKEN = 'gitlab_token';
  process.env.GL_PREFIX = 'prefix';
  const gitlab = authenticate()
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrows(verify({}, {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`}, t.context.logger));

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], ['Verify GitLab authentication (%s)', 'https://othertesturl.com:443/prefix']);
});

test.serial('Verify token and repository access with alternative environment varialbes', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  process.env.GITLAB_URL = 'https://othertesturl.com:443';
  process.env.GITLAB_TOKEN = 'gitlab_token';
  process.env.GITLAB_PREFIX = 'prefix';
  const gitlab = authenticate()
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrows(verify({}, {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`}, t.context.logger));
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError for missing GitLab token', async t => {
  const error = await t.throws(
    verify({}, {repositoryUrl: 'https://gitlab.com/semantic-release/gitlab.git'}, t.context.logger)
  );

  t.true(error instanceof SemanticReleaseError);
  t.is(error.code, 'ENOGLTOKEN');
});

test.serial('Throw SemanticReleaseError for invalid token', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  process.env.GITLAB_TOKEN = 'gitlab_token';
  const gitlab = authenticate()
    .get(`/projects/${owner}%2F${repo}`)
    .reply(401);

  const error = await t.throws(
    verify({}, {repositoryUrl: `https://gitlab.com:${owner}/${repo}.git`}, t.context.logger)
  );

  t.true(error instanceof SemanticReleaseError);
  t.is(error.code, 'EINVALIDGLTOKEN');
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError for invalid repositoryUrl', async t => {
  process.env.GITLAB_TOKEN = 'gitlab_token';
  const gitlabUrl = 'https://gitlab.com/context';

  const error = await t.throws(
    verify({gitlabUrl}, {repositoryUrl: 'git+ssh://git@gitlab.com/context.git'}, t.context.logger)
  );

  t.true(error instanceof SemanticReleaseError);
  t.is(error.code, 'EINVALIDGITURL');
});

test.serial("Throw SemanticReleaseError if token doesn't have the push permission on the repository", async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  process.env.GITLAB_TOKEN = 'gitlab_token';
  const gitlab = authenticate()
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 10}, group_access: {access_level: 20}}});

  const error = await t.throws(
    verify({}, {repositoryUrl: `https://gitlab.com:${owner}/${repo}.git`}, t.context.logger)
  );

  t.true(error instanceof SemanticReleaseError);
  t.is(error.code, 'EGHNOPERMISSION');
  t.true(gitlab.isDone());
});

test.serial("Throw SemanticReleaseError if the repository doesn't exist", async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  process.env.GITLAB_TOKEN = 'gitlab_token';
  const gitlab = authenticate()
    .get(`/projects/${owner}%2F${repo}`)
    .reply(404);

  const error = await t.throws(
    verify({}, {repositoryUrl: `https://gitlab.com:${owner}/${repo}.git`}, t.context.logger)
  );

  t.true(error instanceof SemanticReleaseError);
  t.is(error.code, 'EMISSINGREPO');
  t.true(gitlab.isDone());
});

test.serial('Throw error if GitLab API return any other errors', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  process.env.GITLAB_TOKEN = 'gitlab_token';
  const gitlab = authenticate()
    .get(`/projects/${owner}%2F${repo}`)
    .reply(500);

  const error = await t.throws(
    verify({}, {repositoryUrl: `https://gitlab.com:${owner}/${repo}.git`}, t.context.logger)
  );

  t.is(error.statusCode, 500);
  t.true(gitlab.isDone());
});
