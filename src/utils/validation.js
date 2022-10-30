const { hasDJPermissions } = require('./permissions');
const { botInVC, resetSession } = require('./utils');
const { MAX_QUEUE_S } = require('./lib/constants');

/**
 * Determines whether to proceed with the command, based on the request.
 * Will inform the user of the issue if not a valid request.
 * @param server
 * @param channel
 * @param memberId
 * @param actionDescription A brief description of the command/action.
 * @return {boolean} Returns true if the command should NOT proceed.
 */
function isValidRequestSpecific(server, channel, memberId, actionDescription) {
  if (server.dictator && memberId !== server.dictator.id) {
    channel.send(`only the dictator can ${actionDescription}`);
    return false;
  }
  if (server.lockQueue && !hasDJPermissions(channel, memberId, true, server.voteAdmin)) {
    channel.send(`the queue is locked: only the DJ can ${actionDescription}`);
    return false;
  }
  return true;
}

/**
 * Determines whether to proceed with the command, based on the request.
 * Will inform the user of the issue if not a valid request.
 * @param server
 * @param message
 * @param actionDescription A brief description of the command/action.
 * @return {boolean} Returns true if the command should NOT proceed.
 */
function isValidRequest(server, message, actionDescription) {
  return isValidRequestSpecific(server, message.channel, message.member.id, actionDescription);
}

/**
 * A wrapper for isValidRequest which also assumes that the user is attempting to play or add to the queue.
 * Will inform the user of the issue if not a valid request.
 * @param server
 * @param message
 * @param actionDescription A brief description of the command/action.
 * @return {boolean} Returns true if the command should NOT proceed.
 */
function isValidRequestWPlay(server, message, actionDescription) {
  if (!isValidRequest(server, message, actionDescription)) return false;
  // in case of force disconnect
  if (!botInVC(message)) {
    resetSession(server);
  }
  else if (server.queue.length >= MAX_QUEUE_S) {
    message.channel.send('*max queue size has been reached*');
    return false;
  }
  return true;
}


module.exports = { isValidRequest, isValidRequestWPlay };
