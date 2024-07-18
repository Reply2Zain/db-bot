import play from 'play-dl';
import { MessageEventLocal } from '../../../utils/lib/types';

exports.run = async (_: MessageEventLocal) => {
  play.authorization();
};
