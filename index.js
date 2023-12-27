import FfmpegPath from '@ffmpeg-installer/ffmpeg';
import WAWebJS from "whatsapp-web.js";
import qrcode from 'qrcode-terminal'
import Spinnies from "spinnies";
import chalk from 'chalk';
import removeBg from 'remove.bg';
import puppeteer from 'puppeteer';
import fs from 'fs';
import { createWriteStream } from 'fs';
import https from 'https';
import axios from 'axios';


const spinnies = new Spinnies();
const ffmpegPath = FfmpegPath.path;
const { Client, LocalAuth, MessageMedia } = WAWebJS;

//make me a function to allow download video from twitter

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "one",
    dataPath: "./sessions",
  }),
  ffmpegPath,
  puppeteer: {
    args: ['--no-sandbox']
  }
});

console.log(chalk.green('\n🤖 Simple WhatsApp Bot Sticker by Aromakelapa\n'));

// Init Bot
client.initialize();

spinnies.add('Connecting', { text: 'Opening Whatsapp Web' })

client.on('loading_screen', (percent, message) => {
  // console.log('', percent, message);
  spinnies.update('Connecting', { text: `Connecting. ${message} ${percent}%` });
});

// On Login
client.on('qr', (qr) => {
  spinnies.add('generateQr', { text: 'Generating QR Code' });
  console.log(chalk.yellow('[!] Scan QR Code Bellow'));
  qrcode.generate(qr, { small: true });
  spinnies.succeed('generateQr', { text: 'QR Code Generated' });
  spinnies.update('Connecting', { text: 'Waiting to scan' })
});

// Authenticated
client.on('authenticated', () => {
  // spinnies.update('Connecting', {text: ''});
  console.log(chalk.green(`✓ Authenticated!                          `))
});

// Auth Failure
client.on('auth_failure', (msg) => {
  console.error('Authentication Failure!', msg);
});

// Bot Ready
client.on('ready', () => {
  spinnies.succeed('Connecting', { text: 'Connected!', successColor: 'greenBright' });
  aboutClient(client);
  console.log('Incoming Messages : \n');
});
// Messages Handler
client.on('message', async (msg) => {
  const chat = await msg.getChat();
  const contact = await msg.getContact();
  console.log(chalk.cyan(`💬 ${contact.pushname} : ${msg.body}\n`));

  try {
    switch (msg.body.trim().split(' ')[0].toLowerCase()) {
      case '!stiker':
      case '!sticker':
      case 'st':
        if (msg.hasMedia) {
          const media = await msg.downloadMedia();
          chat.sendMessage(media,
            {
              sendMediaAsSticker: true,
              stickerName: 'Stiker favorit Sendi',
              stickerAuthor: 'Sendi'
            }
          );
          console.log(chalk.green(`💬 ${contact.pushname} : Sticker sent!\n`));
        } else {
          msg.reply('Send image with caption !sticker');
        };
        break;
      case '!rm preview':
        if (msg.hasMedia) {
          const media = await msg.downloadMedia();

          // Remove background from the image
          const removedBgMedia = await removeBackground(media.data);

          // const { MessageMedia } = require('whatsapp-web.js');

          const mediaMessage = new MessageMedia('image/png', removedBgMedia);
          chat.sendMessage(mediaMessage, { caption: 'ini preview foto yang udah dihapus bg nya, King' });

          // Send the image with the background removed
          console.log(chalk.green(`💬 ${contact.pushname} : Preview with removed background sent!\n`));
        } else {
          msg.reply('Send image with caption !rm');
        }
        break;
      case '!rm':
        if (msg.hasMedia) {
          const media = await msg.downloadMedia();

          // Remove background from the image
          const removedBgMedia = await removeBackground(media.data);

          // const { MessageMedia } = require('whatsapp-web.js');

          const mediaMessage = new MessageMedia('document/png', removedBgMedia, 'remove.png');
          chat.sendMessage(mediaMessage, { caption: 'ini foto yang udah dihapus bg nya, King' });

          // Send the image with the background removed
          console.log(chalk.green(`💬 ${contact.pushname} : Image with removed background sent!\n`));
        } else {
          msg.reply('Send image with caption !rm');
        }
        break;

      case '!video':
        const tweetUrl = msg.body.split(' ')[1];
        if (!tweetUrl) {
          msg.reply('Please provide a tweet URL.');
          break;
        }
        console.log(`Downloading video from ${tweetUrl}`);
        const videoPath = await downloadVideo(tweetUrl);
        console.log(`Video downloaded to ${videoPath}`)
        const media = MessageMedia.fromFilePath(videoPath);
        console.log(`Sending video message with mimetype: ${media.mimetype}, filename: ${media.filename}`);
        if (!media) {
          msg.reply('media is not exists');
          break;
        }
        console.log("before msg.reply() function");
        chat.sendMessage(media);
        //msg.reply(media);
        //msg.reply(new MessageMedia('video/mp4', fs.readFileSync(videoPath), 'video'));
        break;

      case '!error':
        new Error();
        break;
    }
  } catch (error) {
    console.error(error);
  };
});

async function removeBackground(mediaData) {
  const result = await removeBg.removeBackgroundFromImageBase64({
    base64img: mediaData,
    apiKey: '8xRHwVY6aEL7Brcw7NeVWJT7',
    size: 'regular',
  });
  return result.base64img;
}

async function downloadVideo(tweetUrl) {
  console.log(`Downloading video from twitter ${tweetUrl}`)
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(tweetUrl);
  await page.waitForSelector('video');
  const videoUrl = await page.evaluate(() => {
    return document.querySelector('video').src;
  });

  console.log(`Video url: ${videoUrl}`);

  const videoPath = 'output.mp4';
  const writer = fs.createWriteStream(videoPath);

  const response = await axios({
    url: videoUrl,
    method: 'GET',
    responseType: 'stream',
  });
  
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log('Video downloaded successfully');
      resolve(videoPath);
    });
    writer.on('error', reject);
  });

}

// Disconnected
client.on('disconnected', (reason) => {
  console.log('Client was logged out, Reason : ', reason);
});



function aboutClient(client) {
  console.log(chalk.cyan(
    '\nAbout Client :' +
    '\n  - Username : ' + client.info.pushname +
    '\n  - Phone    : ' + client.info.wid.user +
    '\n  - Platform : ' + client.info.platform + '\n'
  ));
};