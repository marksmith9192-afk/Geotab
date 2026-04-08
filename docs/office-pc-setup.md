# Office PC Setup Guide

This is the fastest and simplest way to get the tool working for your team.

Use one office PC as the machine that runs the app all the time. Your team opens the app from their browsers over your internal network.

## What "host PC" means

The host PC is just the computer that runs the app for everyone else.

Example:

- the app runs on `OFFICE-PC`
- your team opens `http://OFFICE-PC:5173`

GitHub stores the code.

The office PC actually runs:

- the web UI
- the API
- the SQLite database
- the Playwright browser automation used for live Geotab create/replace flows

## Will it affect normal use of the PC?

Yes, a little.

Most of the time the app should be fairly light.

During live report jobs, the PC may use more:

- CPU
- RAM
- disk activity

That is because the app may launch a browser in the background for Geotab automation.

Recommended:

- okay for a spare office PC
- okay for a lightly used shared PC
- not ideal for someone's main day-to-day workstation

## Easiest setup path

Use the office PC with Node.js directly first.

This is easier to troubleshoot than Docker and is the fastest path to a first working pilot.

## What to install on the office PC

Install these once:

1. [Git for Windows](https://git-scm.com/download/win)
2. [Node.js LTS](https://nodejs.org/en/download)
3. Optional later: Docker Desktop

## Step-by-step setup

### 1. Sign in to GitHub on the office PC

You need access to the private repo:

- [marksmith9192-afk/geotab-report-admin](https://github.com/marksmith9192-afk/geotab-report-admin)

### 2. Clone the repo

Open PowerShell and run:

```powershell
cd C:\Apps
git clone https://github.com/marksmith9192-afk/geotab-report-admin.git
cd geotab-report-admin
git checkout codex-geotab-report-admin-mvp
```

If `C:\Apps` does not exist, create it first.

### 3. Create `.env`

Copy the example file:

```powershell
copy .env.example .env
```

Then edit `.env`.

Recommended first pilot values:

```env
PORT=4000
WEB_PORT=5173
APP_WEB_ORIGIN=http://OFFICE-PC:5173
ADMIN_ACCESS_TOKEN=choose-a-shared-internal-token

DATABASE_URL=file:./dev.db

GEOTAB_PROVIDER_MODE=live
GEOTAB_LIVE_MUTATION_MODE=browser-automation
GEOTAB_ALLOW_CUSTOM_REPORT_CREATION=true
GEOTAB_ALLOWED_REPORT_NAMES=Average_Fuel_Economy_with_Region_Fixed_1

GEOTAB_SERVER=my.geotab.com
GEOTAB_BASE_URL=https://my.geotab.com
GEOTAB_DATABASE=onelink
GEOTAB_USERNAME=your-geotab-username
GEOTAB_PASSWORD=your-geotab-password

GEOTAB_SESSION_PATH=.runtime/geotab-session.json
GEOTAB_PLAYWRIGHT_HEADLESS=true
```

Replace:

- `OFFICE-PC` with the actual computer name
- `ADMIN_ACCESS_TOKEN` with a shared internal secret
- Geotab credentials with the real login

## 4. Install dependencies

Run:

```powershell
npm install
```

## 5. Install Playwright Chromium

Run:

```powershell
npm run automation:install
```

## 6. Build the app

Run:

```powershell
npm run build
```

## 7. Bootstrap the database

Run:

```powershell
npm run db:bootstrap
```

## 8. Start the API and web app

Open two PowerShell windows.

In the first:

```powershell
cd C:\Apps\geotab-report-admin
npm run dev:api
```

In the second:

```powershell
cd C:\Apps\geotab-report-admin
npm run dev:web
```

For a first pilot, this is enough to verify it works.

## 9. Test it from the host PC

Open:

- [http://localhost:5173](http://localhost:5173)

Check:

1. the page loads
2. unlock with the admin access token
3. live reports load
4. `Dry Run Selected` works
5. one approved custom report executes successfully

## 10. Test it from another PC on the same network

Find the host PC name or IP.

Then open:

- `http://OFFICE-PC:5173`
- or `http://192.168.x.x:5173`

If it does not open, the Windows firewall is probably blocking it.

## Firewall note

You may need to allow inbound access to:

- port `5173` for the web app
- port `4000` only if you need direct API access

Usually your team only needs `5173`.

## Keeping it running after reboot

For the very first pilot, you can just leave the two PowerShell windows open.

For a cleaner setup later, use one of these:

1. Windows Task Scheduler
2. NSSM to run Node as a Windows service
3. Docker Compose with automatic restart

Fastest first step:

- get it working manually first
- automate startup second

## Daily operations

Normal use:

- low to moderate resource use

During live Geotab changes:

- browser automation may run in the background
- CPU and memory use can spike for a short time

That is why a spare office PC is better than someone's main workstation.

## Recommended first pilot rule

Keep live changes restricted at first:

```env
GEOTAB_ALLOWED_REPORT_NAMES=Average_Fuel_Economy_with_Region_Fixed_1
```

That way your team can use the tool, but only against one approved custom report until you are comfortable broadening it.

## When this setup is "good enough"

You are ready for real internal pilot use when:

1. the office PC can run both app processes reliably
2. another PC on the network can open the app
3. the team can unlock it with the admin token
4. dry run works
5. one approved live replacement succeeds

At that point, the office PC setup is a workable internal host.
