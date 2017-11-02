'use strict';

//definition library
const aws = require('aws-sdk');
const co = require('co');
const s3 = new aws.S3();
const polly = new aws.Polly();

//difinition variables
const PREFIX = 'mp3/';
const OUTPUT_FORMAT = 'mp3';
// Mizuki or Takumi
const VOICE_ID = 'Mizuki';
const TEXT_TYPE = 'text';

exports.handler = (event, context, callback) => {
  console.log('start function');

  co(function* () {
    // text data
    const text = yield getObject();

    // audio data
    const audio = yield synthesizeSpeech(text);

    // s3 upload
    yield putObject(audio);

    return null;
  }).then(onEnd).catch(onError);

  // get text data
  function getObject() {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: event.Records[0].s3.bucket.name,
        Key: event.Records[0].s3.object.key
      };
      s3.getObject(params, (error, data) => {
        if (error) {
          reject(error);
        } else {
          console.log(JSON.stringify(data));
          resolve(data.Body);
        }
      });
    });
  }

  // convert text to audio
  function synthesizeSpeech(text) {
    return new Promise((resolve, reject) => {
      const params = {
        OutputFormat: OUTPUT_FORMAT,
        Text: text.toString(),
        VoiceId: VOICE_ID,
        TextType: TEXT_TYPE
      };
      polly.synthesizeSpeech(params, (error, data) => {
        if (error) {
          reject(error);
        } else {
          console.log(JSON.stringify(data));
          resolve(data.AudioStream);
        }
      });
    });
  }

  // s3 upload
  function putObject(audio) {
    return new Promise((resolve, reject) => {
      const filename = event.Records[0].s3.object.key.replace(/.*\//g, '').replace(/.txt/, '.mp3');
      const params = {
        Bucket: event.Records[0].s3.bucket.name,
        Key: PREFIX + filename,
        Body: audio
      };
      s3.putObject(params, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(null);
        }
      });
    });
  }

  // end
  function onEnd(result) {
    console.log('finish function');
    callback(null, 'succeed');
  }

  // error
  function onError(error) {
    console.log(error, error.stack);
    callback(error, error.stack);
  }
};