import puppeteer from 'puppeteer-core'
import ChromeRemoteInterface from 'chrome-remote-interface'
import fs from 'fs'

async function launch(viewPort: { width: number, height: number }, url: string) {
    console.log('Launching chrome!')

    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        ignoreHTTPSErrors: true,
        args: [
            '--no-sandbox'
        ],
        headless: true
    });


    const context = await browser.createIncognitoBrowserContext()

    const page = await context.newPage();

    await page.setViewport({
        ...viewPort,
        deviceScaleFactor: 1
    })

    await page.goto(url);

    await page.waitFor(500);
    console.log('getting endpoint...')

    const wsEndpoint = browser.wsEndpoint()
    console.log('Ws endpoint')
    console.log(wsEndpoint)

    const matches = wsEndpoint.match(/:(\d+)/)

    if (!matches) {
        throw new Error('Could not determine devprotocol port.')
    }

    const port = parseInt(matches[1])

    if (isNaN(port)) {
        throw new Error('Could not determine devprotocol port. (NaN)')
    }

    console.log('Port is ' + port)

    return {
        port,
        page,
        browser
    }
}

async function main() {
    const prefix = '1-'

    const format = 'jpeg'
    const extension = '.jpeg'

    const { page, browser, port } = await launch({
        height: 1080,
        width: 1920
    }, 'https://j140c.csb.app/')


    const remoteInterface = await ChromeRemoteInterface({
        port: port
    })

    console.log('Waiting for page, runtime enable')
    const Page = remoteInterface.Page;
    const Runtime = remoteInterface.Runtime;

    Page.B

    await Promise.all([Page.enable(), Runtime.enable()]);
    console.log('All enabled!')

    let castNumber = 0

    const tmpPath = './sat-differences'

    remoteInterface.on('Page.screencastFrame', async event => {
        console.log("TAKING SCREENCASST!")
        await Page.screencastFrameAck({ sessionId: event.sessionId })

        const data = event.data.replace(/^data:image\/\w+;base64,/, "");
        const buf = Buffer.from(data, 'base64');

        fs.writeFileSync(tmpPath + `/${prefix}cast-${castNumber}${extension}`, buf)

        castNumber++
    });

    await Page.startScreencast({
        format: format,
        quality: 100,
        everyNthFrame: 0
    });

    // await Page.stopScreencast({
    //     format: format,
    //     quality: 100,
    //     everyNthFrame: 0
    // });

    const screenData = await Page.captureScreenshot({
        format: format,
        quality: 100
    });

    const data = screenData.data.replace(/^data:image\/\w+;base64,/, "");
    const buf = Buffer.from(data, 'base64');

    console.log('Writing normal...')
    fs.writeFileSync(tmpPath + `/${prefix}normal-${extension}`, buf)

    await page.screenshot({
        clip: {
            height: 1080,
            width: 1920,
            x: 0,
            y: 0
        },
        type: format,
        quality: 100,
        path: tmpPath + `/${prefix}puppeteer-${extension}`
    })

    console.log("DONE!")
} 

main()
