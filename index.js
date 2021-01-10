const speedtest = require("speedtest-net");
const DEFAULT_OPTIONS = { acceptGdpr: true, acceptLicense: true, progress: progress };

const cli = require("cli-progress");

/**
 * @typedef {Object} SpeedBar
 * @property {cli.MultiBar} [root]
 * @property {cli.SingleBar} [ping]
 * @property {cli.SingleBar} [download]
 * @property {cli.SingleBar} [upload]
 * @property {cli.SingleBar} [progress]
 */

/**
 * @type {SpeedBar}
 */
let multiBar = {};
let interval;
let timeElapsed = 0;

async function init() {
    let result;
    try {
        result = await speedtest(DEFAULT_OPTIONS);
    } catch (err) {
        console.error(err);
        return;
    }
    endTicker();
    deleteMultiBar();
    console.log(
        "\n" +

        "RESULTS\n" +
        `Latency: ${result.ping.latency.toFixed(0)}ms\n` +
        `Jitter: ${result.ping.jitter.toFixed(0)}ms\n` +
        `Download: ${bytesToMegabits(result.download.bandwidth)}Mbps\n` +
        `Upload: ${bytesToMegabits(result.upload.bandwidth)}Mbps\n` +
        `Packet Loss: ${result.packetLoss.toFixed(0)}%\n` +
        `Elapsed Time: ${timeElapsed}secs`
    );
    timeElapsed = 0;
    process.exit(0);
}

function progress(data) {
    switch (data.type) {
        case "testStart": {
            createMultiBar();
            console.log(
                "TEST INFORMATION\n" +
                `ISP: ${data.isp}\n` +
                `Public IP: ${data.interface.externalIp}\n` +
                `Server: ${data.server.location}, ${data.server.country}\n`
            );
            break;
        }
        case "ping": {
            if (!multiBar.ping) {
                multiBar.ping = multiBar.root.create(1, 0, { type: "PING", result: "0ms" });
            }
            multiBar.ping.update(data.ping.progress, { result: `${data.ping.latency.toFixed(0)}ms` });
            break;
        }
        case "download": {
            if (!multiBar.download) {
                multiBar.download = multiBar.root.create(1, 0, { type: "DOWNLOAD", result: "0Mbps" });
            }
            multiBar.download.update(data.download.progress, { result: `${bytesToMegabits(data.download.bandwidth)}Mbps` });
            break;
        }
        case "upload": {
            if (!multiBar.upload) {
                multiBar.upload = multiBar.root.create(1, 0, { type: "UPLOAD", result: "0Mbps" });
            }
            multiBar.upload.update(data.upload.progress, { result: `${bytesToMegabits(data.upload.bandwidth)}Mbps` });
            break;
        }
    }
    if (!multiBar.progress) {
        multiBar.progress = multiBar.root.create(1, 0, { type: "PROGRESS", result: "0secs" });
    }
    multiBar.progress.update(data.progress);
}

function createMultiBar() {
    multiBar.root = new cli.MultiBar({
        format: "{type} : [{bar}] {result}",
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: false
    });

    if (interval != undefined) {
        endTicker();
    }
    interval = setInterval(() => {
        multiBar.progress.update({ result: `${timeElapsed}secs` });
        timeElapsed++;
    }, 1000);
}

function deleteMultiBar() {
    multiBar.root.stop();
    multiBar = {};
}

function bytesToMegabits(bytes) {
    return (bytes / 125000).toFixed(2);
}

function endTicker() {
    clearInterval(interval);
    interval = undefined;
}

init();