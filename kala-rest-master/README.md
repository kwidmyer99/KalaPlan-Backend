# kala-rest

RESTful API server using Next.js for planner web app of kala plan shopify site

## Dependencies

1. Node.js (using NVM to install LTS version is recommended)
2. Yarn
3. ngrok (on local development machine, in order to let the web app access the server API)
4. PM2 (on production server)
5. (Optional) Docker and Docker Compose (on production server) for DB on same server host. Here is the `docker-compose.yml`: https://github.com/x-and-ai/kalaplan-docker/blob/main/docker-compose.yml. Alternatively, an independed MongoDB server works too, just make sure to update the DB server ip and port in this repo's source code.

## Usage

1. Run `yarn install`
2. Run `yarn dev` and `yarn ngrok` for local development
3. Run `yarn build`
4. Use SFTP or scp to upload built server app to remote server
