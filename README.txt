TO START THE DOCKER CONTAINER YOU NEED TO BUILD IT WITH A SECRET TOKEN

to build the image --> \
docker build -t hress .

to run the container --> \
docker run -d --name hress --env-file ./.env -p 7100:7100 hress
