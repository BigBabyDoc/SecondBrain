# Развёртывание в Яндекс Облаке

Пошаговая инструкция для боевого запуска. Данные остаются на территории РФ — это
требование ч. 5 ст. 18 152-ФЗ для персональных данных граждан России.

## Что понадобится

| Сервис | Зачем | Конфигурация для старта |
| --- | --- | --- |
| Compute Cloud (ВМ) | Приложение | Ubuntu 24.04, 2 vCPU, **4 ГБ RAM**, 20 ГБ SSD |
| Managed Service for PostgreSQL | База данных | PostgreSQL 16, минимальный класс, 10 ГБ |
| Cloud DNS | Домен | Если домен обслуживается в Яндекс Облаке |
| Object Storage | Бэкапы | Опционально, один бакет |

4 ГБ памяти взяты не случайно: `next build` на 1–2 ГБ падает по нехватке памяти.
Если берёте машину меньше, добавьте swap-файл или собирайте образ отдельно.

Postgres можно поставить и прямо на ВМ — это дешевле, но тогда бэкапы придётся
настраивать самостоятельно (`pg_dump` по расписанию в Object Storage). Для базы с
платежами и персональными данными управляемый кластер с автоматическими бэкапами
и PITR надёжнее.

## 1. Сеть и база

1. Создайте облачную сеть и подсеть в одной зоне доступности (например `ru-central1-a`).
2. Создайте кластер Managed PostgreSQL 16: базу `secondbrain`, пользователя, пароль.
3. Разместите ВМ в той же подсети — тогда публичный доступ к базе включать не нужно.

Подключение к управляемой базе идёт по TLS с собственным удостоверяющим центром
Яндекса, поэтому на ВМ нужен его сертификат:

```bash
mkdir -p ~/.postgresql
curl -o ~/.postgresql/root.crt https://storage.yandexcloud.net/cloud-certs/CA.pem
chmod 0600 ~/.postgresql/root.crt
```

## 2. Виртуальная машина

Создайте ВМ с Ubuntu 24.04 и **статическим** публичным IP — динамический меняется
при перезапуске и ломает DNS-запись.

Группа безопасности:

| Направление | Порт | Источник |
| --- | --- | --- |
| Входящий | 80, 443 | `0.0.0.0/0` |
| Входящий | 22 | только ваш IP |
| Исходящий | все | `0.0.0.0/0` |

## 3. Домен

Создайте A-запись домена на статический IP машины и дождитесь распространения DNS —
Caddy не сможет выпустить сертификат, пока домен не резолвится в этот адрес.

## 4. Софт на сервере

```bash
sudo apt update && sudo apt install -y curl git

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Caddy — обратный прокси с автоматическим HTTPS
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

# Отдельный пользователь для приложения
sudo useradd -m -s /bin/bash app
```

## 5. Код и переменные окружения

```bash
sudo -iu app
git clone https://github.com/BigBabyDoc/SecondBrain.git ~/secondbrain
cd ~/secondbrain
cp .env.example .env
nano .env
```

Минимальный боевой `.env`:

```env
DATABASE_URL="postgresql://user:pass@rc1a-xxxx.mdb.yandexcloud.net:6432/secondbrain?sslmode=verify-full&sslrootcert=/home/app/.postgresql/root.crt"

AUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="https://ваш-домен.ru"
AUTH_TRUST_HOST=true

YOOKASSA_SHOP_ID="..."
YOOKASSA_SECRET_KEY="..."

SMTP_HOST="smtp.mail.ru"
SMTP_PORT="465"
SMTP_USER="second_brain_pediatra@mail.ru"
SMTP_PASSWORD="<пароль для внешних приложений>"
MAIL_FROM="second_brain_pediatra@mail.ru"

CRON_SECRET="<openssl rand -hex 32>"
```

Три вещи, без которых будет ломаться:

- **`AUTH_TRUST_HOST=true`** — за обратным прокси NextAuth v5 иначе отвергает запросы
  с ошибкой `UntrustedHost`, и вход перестаёт работать.
- **`NEXTAUTH_URL`** должен быть боевым `https`-адресом: он подставляется в ссылки
  из писем, в `return_url` для ЮKassa и в `sitemap.xml`.
- **`SMTP_PASSWORD`** для Mail.ru — это отдельный «пароль для внешних приложений»
  из настроек почты, а не пароль от ящика.

## 6. Сборка и запуск

```bash
npm ci
npx prisma migrate deploy
npm run build
```

> **Не запускайте `npx prisma db seed` на проде.** Пароли демо-аккаунтов лежат в
> открытом виде в репозитории. Сид намеренно отказывается работать при
> `NODE_ENV=production` без заданных `SEED_ADMIN_PASSWORD` и `SEED_DOCTOR_PASSWORD`.
> Администратора лучше создать вручную или один раз засеять со своими паролями.

Скопируйте юнит и запустите сервис:

```bash
exit  # вернуться из-под пользователя app
sudo cp /home/app/secondbrain/deploy/secondbrain.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now secondbrain
sudo systemctl status secondbrain
```

## 7. HTTPS

```bash
sudo cp /home/app/secondbrain/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile   # заменить example.ru на свой домен
sudo systemctl reload caddy
```

Сертификат Let's Encrypt Caddy выпустит сам и будет продлевать автоматически.
HTTPS здесь обязателен: через него передаются пароли и персональные данные.

## 8. Ежедневная задача по подпискам

```bash
sudo cp /home/app/secondbrain/deploy/secondbrain-cron.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now secondbrain-cron.timer

# разовая проверка
sudo systemctl start secondbrain-cron.service
sudo journalctl -u secondbrain-cron.service -n 20
```

Без этой задачи истёкшие подписки не переводятся на бесплатный тариф, а
напоминания об окончании не рассылаются.

## 9. ЮKassa

1. В личном кабинете укажите вебхук `https://ваш-домен.ru/api/webhooks/yookassa`.
2. В разделе «Отправка чеков» выдайте разрешение работать с чеками через «Мой налог» —
   без этого чек по платежу не сформируется.

## 10. Проверка после запуска

- регистрация нового пользователя, письмо реально доходит до почты;
- переход по ссылке подтверждения открывает доступ к оплате;
- тестовый платёж проходит, подписка активируется, приходит чек;
- восстановление пароля работает;
- `https://ваш-домен.ru/robots.txt` и `/sitemap.xml` отдают боевой домен, а не localhost.

## Обновление версии

```bash
sudo -iu app
cd ~/secondbrain
git pull
npm ci
npx prisma migrate deploy
npm run build
exit
sudo systemctl restart secondbrain
```

## Бэкапы

У Managed PostgreSQL автоматические бэкапы включены по умолчанию — проверьте
глубину хранения в настройках кластера. Если Postgres стоит на самой ВМ, настройте
ночной `pg_dump` с выгрузкой в Object Storage; база с платежами и персональными
данными без бэкапа — недопустимый риск.
