import { Injectable } from '@nestjs/common';
import { WhatsappSession } from '@waha/core/abc/session.abc';
import { sleep } from '@waha/utils/promiseTimeout';
import { MessageTextRequest } from '@waha/structures/chatting.dto';

@Injectable()
export class BanProtectionService {
  /**
   * Parse Spintax in message text: {Hello|Hi|Hey} -> Hi
   */
  parseSpintax(text: string): string {
    const spintaxRegex = /\{([^{}]+)\}/g;
    return text.replace(spintaxRegex, (match, options) => {
      const choices = options.split('|');
      return choices[Math.floor(Math.random() * choices.length)];
    });
  }

  /**
   * Add invisible variation to text to bypass hash/fingerprint detection
   */
  applyInvisibleVariation(text: string): string {
    // 1. Zero-width characters (invisible to humans, unique to AI)
    const zeroWidthChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
    
    // 2. Randomly insert 1-3 zero-width chars at random positions
    let modifiedText = text;
    const numVariations = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numVariations; i++) {
      const pos = Math.floor(Math.random() * modifiedText.length);
      const char = zeroWidthChars[Math.floor(Math.random() * zeroWidthChars.length)];
      modifiedText = modifiedText.slice(0, pos) + char + modifiedText.slice(pos);
    }

    // 3. Randomly replace standard space with non-breaking space (occasionally)
    if (Math.random() > 0.7) {
      const spaces = [];
      for (let i = 0; i < modifiedText.length; i++) {
        if (modifiedText[i] === ' ') spaces.push(i);
      }
      if (spaces.length > 0) {
        const randomSpaceIdx = spaces[Math.floor(Math.random() * spaces.length)];
        modifiedText = modifiedText.slice(0, randomSpaceIdx) + '\u00A0' + modifiedText.slice(randomSpaceIdx + 1);
      }
    }

    return modifiedText;
  }

  /**
   * Randomize emojis to break pattern detection
   */
  randomizeEmojis(text: string): string {
    const emojiMap: { [key: string]: string[] } = {
      '😊': ['😊', '🙂', '😃', '✨'],
      '👍': ['👍', '👌', '✔️', '🤝'],
      '🙏': ['🙏', '🤝', '✨', '🙌'],
      '👋': ['👋', '🙌', '✨', '😊'],
    };

    let modifiedText = text;
    for (const [emoji, variations] of Object.entries(emojiMap)) {
      if (modifiedText.includes(emoji)) {
        const randomVariation = variations[Math.floor(Math.random() * variations.length)];
        modifiedText = modifiedText.split(emoji).join(randomVariation);
      }
    }
    return modifiedText;
  }

  /**
   * Simulate human-like behavior before sending a message
   */
  async simulateHumanBehavior(
    whatsapp: WhatsappSession,
    request: MessageTextRequest,
  ) {
    const text = request.text;
    const chatId = request.chatId;

    // 1. Random delay before doing anything (3-7 seconds)
    const initialDelay = Math.floor(Math.random() * 4000) + 3000;
    await sleep(initialDelay);

    // 2. Mark as seen
    try {
      await whatsapp.sendSeen({ session: whatsapp.name, chatId });
    } catch (e) {
      // Ignore
    }

    // 3. Start typing (Duration based on message length: ~15 chars per second)
    const typingDuration = Math.min(
      Math.max((text.length / 15) * 1000, 2000), // Min 2s, Max 15s
      15000,
    );
    const randomizedTypingDuration =
      typingDuration * (0.8 + Math.random() * 0.4); // +/- 20% randomization

    try {
      await whatsapp.startTyping({ session: whatsapp.name, chatId });
      await sleep(randomizedTypingDuration);
      await whatsapp.stopTyping({ session: whatsapp.name, chatId });
    } catch (e) {
      // Ignore
    }

    // 4. Final short delay before sending (1-3 seconds)
    const finalDelay = Math.floor(Math.random() * 2000) + 1000;
    await sleep(finalDelay);
  }

  /**
   * Randomized wait between multiple messages in a bulk send
   */
  async waitBetweenMessages() {
    const wait = Math.floor(Math.random() * 10000) + 5000; // 5-15 seconds
    await sleep(wait);
  }
}
