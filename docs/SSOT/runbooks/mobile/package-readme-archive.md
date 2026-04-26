# 🌟 Karma Community Project

Welcome to the **Karma Community** project!
This is a mono-repo project (Mono-repo style) that includes a mobile application (React Native/Expo) and a backend server (NestJS).

This document will explain **step by step** how to set up the development environment, with special emphasis on Windows users.

---

## 📂 The structure of the project

The project is divided into two main subsystems:

- **MVP/** 📱: Client side (application). Written in React Native with Expo. Works on iPhone, Android and web browser.
- **KC-MVP-server/** 🚀: Server side (Backend). The brain of the system. Saves data in the DB and sends it to the application.

---

## 🛠 Prerequisites - what needs to be installed?

### 🪟 Windows users (extremely detailed explanation)

If you have Windows, you must install the following tools **in this order**. Don't skip!

#### 1. Installing Git (and git bash)
We need a tool that knows how to run commands like in Linux/Mac.
1. Go to the website: [git-scm.com](https://git-scm.com/download/win)
2. Click **Download**.
3. Download the file (usually called `64-bit Git for Windows Setup`).
4. Run the installation and do "Next", "Next", "Next"... until the end. **Do not change anything in the settings**.
5. At the end of the installation, search your computer for a software named **Git Bash**. This is the software we will use to run commands.

#### 2. Installing Node.js
This is the environment that runs our code (JavaScript).
1. Go to the website: [nodejs.org](https://nodejs.org/en)
2. Download the **LTS** version (the stable version, on the left). It is currently version 20 or 22.
3. Run the installation and do "Next" to the end.
4. To test that it works: open **Git Bash** and type: `node -v`. You should see a version number (eg `v20.10.0`).

#### 3. Installing Docker Desktop
This is the tool that runs the database on your computer without you having to install it complicatedly.
1. Go to the website: [docker.com](https://www.docker.com/products/docker-desktop/)
2. Click on **Download for Windows**.
3. Install the software. **Note:** He may ask you to install something called WSL 2. Confirm him and follow his instructions (he may ask to reset the computer).
4. After the installation and reset, **start the software Docker Desktop**. Wait for it to come up.
5. On the lower left side of the software it should be written in green "Engine running". If it's red or orange - it doesn't work.

---

### 🍎 macOS users
The most favorable environment for development.

1. **Node.js**: It is recommended to install via Homebrew: `brew install node`.
2. **Watchman**: `brew install watchman` (prevents bugs in React Native).
3. **Git**: `brew install git`.
4. **Docker Desktop**: [Download and Install](https://www.docker.com/products/docker-desktop/). **Must run the app after installation!**
5. **Xcode**: If you want to run an iPhone simulator. Download from the App Store.

---

### 🐧 Linux users
For the advanced.

1. **Node.js**: version 18 or higher.
2. **Git**: `sudo apt install git`.
3. **Docker**: `sudo apt install docker.io`. **Important:** Add your user to the docker group: `sudo usermod -aG docker $USER`.

---

## 🚀 How do you start working? (the easy and automatic way)

We wrote a special script that does all the dirty work for you.
is automatically:
1. Pick up the docker (database).
2. Installs all the packages that the server needs.
3. Starts the server.
4. Runs the application.

### Running instructions (step by step):

#### Step 1: Open Terminal
* **On Windows:** Open the software **Git Bash** (don't use regular CMD or PowerShell).
* **On Mac/Linux:** Open the normal Terminal.

#### Step 2: Navigate to the project folder
You should be in the main folder `KC/DEV`.
For example:
```bash
cd /c/Users/YourName/KC/DEV
```
(Substitute the path for your real path).

#### Step 3: Run the magic command
Just copy this line to the terminal and press ENTER:

```bash
bash MVP/scripts/run-local-e2e.sh
```

#### Step 4: What happens now?
* You will see a lot of running text. It is normal. He installs and builds things.
* If he asks for a password (on Mac/Linux) - give it to him.
* **At the end of the process:** Your browser should open automatically at `http://localhost:8081`.
* If the browser does not open, open it manually and enter this address.

**this is! The app works.** 🎉
You should see the login screen or home page of the app.

---

## 🏗️ Manual installation (only if the automatic one does not work)

If the script above fails, here's how to do it "the old fashioned way", manually.

### Step 1: ServerMainly for Windows

### 🔴 "docker command not found" / "docker not found"
**The problem:** Docker is not installed or not working.
**The solution:**
1. Make sure you have **Docker Desktop** installed.
2. Make sure **that you've started** the Docker Desktop software and it's running in the background (look for a little whale icon next to the clock below).

### 🔴 Strange "Permission denied" or "EACCESS" errors
**The problem:** Windows has permission problems sometimes.
**The solution:** Try to close the Git Bash and reopen it, this time right click -> "Run as Administrator".

### 🔴 The script is stuck on "Waiting for Postgres..."
**The problem:** The docker fails to mount.
**The solution:**
1. Open the Docker Desktop software.
2. If you see old containers (in the list in the middle) - delete them (trash bin icon).
3. Try running the script again.

### 🔴 The application in the browser is stuck on a white screen or "Network Error"
**The problem:** The app can't talk to the server.
**The solution:**
1. Make sure the server (in the first terminal) is still running and hasn't crashed.
2. Try to refresh the page in the browser.
3. Try to start browsing incognito.

---

## 🌍 work environments (Environments)

It is very important to understand that we work with **3 different environments**.
Always make sure you know where you are before making changes!

### 1. Local Development 💻 (the local environment)
- **What is this:** The code that is currently running on your computer (localhost).
- **What it is used for:** Development, experiments, "breaking things".
- **How ​​to identify:** The address is `localhost:8081`.
- **The banner above:** Green 🟩 (it says "isolated data").

### 2. Cloud Development ☁️ (development environment in the cloud)
- **What it is:** A live version on the web, but intended for development and testing.
- **Address:** [https://dev.karma-community-kc.com](https://dev.karma-community-kc.com)
- **What it is used for:** To show friends/testers new features before releasing to everyone.
- **Banner above:** Green 🟩 (also here it says "isolated data").
- **Database:** Completely separate from production! (KC-DEV-Postgres).

### 3. Production 🚨 (the real environment)
- **What it is:** The real app that customers use.
- **Address:** [https://karma-community-kc.com](https://karma-community-kc.com)
- **Banner above:** ❌ **No banner!**
- **Iron law:** Experiments are prohibited here. Any changes affect real users.

### 💡 How to remember?
* **See green? 🟩** - feel free, you are safe.
* **Don't see green?** - Stop and think twice.

successfully! 👨 💻