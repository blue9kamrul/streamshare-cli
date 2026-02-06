# StreamShare CLI 📡

A zero-dependency, lightweight Node.js CLI tool for instantly streaming files over a local network. Built entirely with **Raw Node.js** APIs to demonstrate efficient memory management and low-level HTTP handling.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node->=14.0.0-green.svg)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)

## 🚀 Why This Project?

Most file-sharing tools rely on heavy frameworks like Express.js or socket.io. **StreamShare** was built to demonstrate how to handle high-performance I/O operations using only the Node.js standard library.

It solves the **"Heap Out of Memory"** problem common in beginner Node.js apps by using **Streams** and **Pipes** to serve files of any size (even 10GB+) with constant, low memory usage (RAM).

## ✨ Key Features

* **Zero Dependencies:** No `express`, `commander`, or `yargs`. Just pure Node.js.
* **Memory Efficient:** Uses `fs.createReadStream()` to pipe data directly to the HTTP response.
* **Network Discovery:** Automatically detects the machine's local IP using the `os` module.
* **Smart Headers:** Dynamic MIME-type detection and Content-Disposition for proper file handling.
* **Real-time Feedback:** Custom-built CLI progress bar tracking the data stream.

## 🛠️ Technical Architecture

This tool leverages the following core Node.js concepts:

1.  **`http` Module:** Creates a raw server to handle requests and manage headers manually.
2.  **`fs` Streams:** Reads files in chunks (buffers) rather than loading the entire file into memory.
3.  **`process.stdout`:** Manipulates the cursor to create a rewriteable progress bar in the terminal.
4.  **`child_process`:** Automates OS-level commands to open the default browser.
5.  **`os` Interfaces:** Filters network interfaces to find the correct IPv4 address.

## 📦 Installation

Since this is a CLI tool, you can link it globally on your machine.

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/your-username/streamshare-cli.git](https://github.com/your-username/streamshare-cli.git)
    cd streamshare-cli
    ```

2.  **Link globally** (simulates an npm install)
    ```bash
    npm link
    ```
    *(Note: You may need `sudo npm link` on macOS/Linux)*

## 💻 Usage

Once installed, you can use the `streamshare` command from anywhere in your terminal.

**Syntax:**
```bash
streamshare start <filename>