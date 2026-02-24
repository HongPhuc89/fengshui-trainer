# Project Rules

## Django Commands

All Django management commands must be run inside docker-compose, not locally.

- docker-compose file: `docker/docker-compose.yml`
- Django service name: `web`

```bash
docker-compose -f docker/docker-compose.yml exec web python manage.py <command>
```

Examples:
```bash
docker-compose -f docker/docker-compose.yml exec web python manage.py migrate
docker-compose -f docker/docker-compose.yml exec web python manage.py makemigrations
docker-compose -f docker/docker-compose.yml exec web python manage.py shell
```
