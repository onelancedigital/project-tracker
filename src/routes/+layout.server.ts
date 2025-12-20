export async function load() {
  return {
    version: process.env.DOCKER_TAG || 'dev'
  };
}
