const {getTracks} = require('spotify-url-info');
const ytpl = require('ytpl');
const {MAX_QUEUE_S, SPOTIFY_BASE_LINK, SOUNDCLOUD_BASE_LINK, StreamType} = require('../utils/constants');
const {linkFormatter} = require('../utils/utils');
// should be completed before first query
let scpl = require("scdl-core").SoundCloud.create().then(x => scpl = x);
const YTMAPI = require('youtube-music-api');
const ytmpl = new YTMAPI();
ytmpl.initalize().then();

/**
 * Adds playlists to the queue.
 * @param message The message metadata
 * @param server The server.
 * @param mgid The message guild id
 * @param pNums {number} The number of items added to queue
 * @param playlistUrl {string} The url of the playlist
 * @param linkType {string} Either 'sp' 'sc' or 'yt' depending on the type of link.
 * @param addToFront {boolean=} Optional - true if to add to the front of the queue
 * @param position {number=} Optional - the position of the queue to add the item to
 * @returns {Promise<Number>} The number of items added to the queue
 */
async function addPlaylistToQueue (message, server, mgid, pNums, playlistUrl, linkType, addToFront, position) {
  const playlist = await getPlaylistArray(playlistUrl, linkType);
  try {
    let url;
    if (addToFront) {
      let itemsLeft = MAX_QUEUE_S - server.queue.length;
      let lowestLengthIndex = Math.min(playlist.length, itemsLeft) - 1;
      let item;
      while (lowestLengthIndex > -1) {
        item = playlist[lowestLengthIndex];
        lowestLengthIndex--;
        url = getUrl(item, linkType);
        if (itemsLeft > 0) {
          if (url) {
            server.queue.unshift(url);
            pNums++;
            itemsLeft--;
          }
        } else {
          message.channel.send('*queue is full*');
          break;
        }
      }
    } else {
      let itemsLeft = MAX_QUEUE_S - server.queue.length;
      for (let j of playlist) {
        url = getUrl(j, linkType);
        if (itemsLeft > 0) {
          if (url) {
            if (position && !(position > server.queue.length)) {
              server.queue.splice(position, 0, url);
              position++;
            } else server.queue.push(url);
            pNums++;
            itemsLeft--;
          }
        } else {
          message.channel.send('*queue is full*');
          break;
        }
      }
    }
  } catch (e) {
    console.log(e);
    message.channel.send('there was an error');
  }
  return pNums;
}

/**
 * Gets the array of playlist items.
 * @param playlistUrl The playlist URL.
 * @param type {string} Either 'sp', 'yt' or 'sc' regarding the type of URL.
 * @returns {Promise<[]>} An Array of link metadata.
 */
async function getPlaylistArray (playlistUrl, type) {
  switch (type) {
    case StreamType.SPOTIFY:
      // filter ensures that each element exists
      return (await getTracks(playlistUrl)).filter(track => track);
    case StreamType.YOUTUBE:
      if (playlistUrl.includes('music.youtube')) {
        const listString = 'list=';
        const listIdStart = playlistUrl.indexOf(listString);
        if (listIdStart === -1) return [];
        let id = playlistUrl.substr(listIdStart + listString.length);
        if (id.includes('&')) id = playlistUrl.substr(0, playlistUrl.indexOf('&'));
        return (await ytmpl.getPlaylist(id)).content;
      } else {
        return (await ytpl(await ytpl.getPlaylistID(playlistUrl), {pages: 10})).items;
      }
    case StreamType.SOUNDCLOUD:
      return (await scpl.playlists.getPlaylist(linkFormatter(playlistUrl, SOUNDCLOUD_BASE_LINK))).tracks;
    default:
      console.log(`Error: invalid linkType argument within addPlaylistToQueue`);
      throw `Error: Incorrect type provided, provided ${type}`;
  }
}

/**
 * Gets the url of the item from the infos.
 * @param item A single track's metadata.
 * @param type {string} Either 'sp' 'sc' or 'yt' depending on the source of the infos.
 * @returns {string} The url.
 */
function getUrl (item, type) {
  switch (type) {
    case 'sp':
      return item.external_urls.spotify;
    case 'yt':
      if (item.videoId) return `https://youtube.com/watch?v=${item.videoId}`;
      return item.shortUrl || item.url;
    case 'sc':
      return item.permalink_url;
    default:
      const errString = `Error: Incorrect type provided, provided ${type}`;
      console.log(errString);
      throw errString;
  }
}

/**
 * Returns 'sp' 'sc' or 'yt' depending on the source of the infos.
 * @param url The url to get the type of.
 * @returns {string} 'sp' 'sc' or 'yt'
 */
const getLinkType = (url) => {
  if (url.includes(SPOTIFY_BASE_LINK)) return 'sp';
  else if (url.includes(SOUNDCLOUD_BASE_LINK)) return 'sc';
  return 'yt';
};

/**
 * Un-package the playlist url and push it to the given array.
 * @param url A Spotify or YouTube playlist link.
 * @param tempArray The array to push to.
 * @returns {Promise<number>} The number of items pushed to the array.
 */
async function getPlaylistItems (url, tempArray) {
  const linkType = getLinkType(url);
  const playlist = await getPlaylistArray(url, linkType);
  let itemCounter = 0;
  try {
    // add all the songs from the playlist to the tempArray
    for (let j of playlist) {
      url = getUrl(j, linkType);
      if (url) {
        tempArray.push(url);
        itemCounter++;
      }
    }
  } catch (e) {
    console.log(`Error in getPlaylistItems: ${url}\n`, e);
  }
  return itemCounter;
}

module.exports = {addPlaylistToQueue, getPlaylistItems};
