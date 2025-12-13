import axios from 'axios';
import { parseStringPromise } from 'xml2js';

interface EmergencyWarning {
  title: string;
  description: string;
  link: string;
  lastBuildDate: string;
  items?: Array<{
    title: string;
    description: string;
    link: string;
    pubDate: string;
  }>;
}

export class EmergencyWarningService {
  private static readonly RSS_URL = 'https://www.dmc.gov.lk/index.php?option=com_content&view=category&layout=blog&id=16&Itemid=237&format=feed&type=rss&lang=en';

  /**
   * Fetch emergency warnings from DMC RSS feed
   */
  static async fetchWarnings(): Promise<EmergencyWarning | null> {
    try {
      const response = await axios.get(this.RSS_URL, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Fire Guardian Control Center/1.0'
        }
      });

      const xml = response.data;
      const parsed = await parseStringPromise(xml, { explicitArray: false });

      const channel = parsed.rss.channel;

      // Extract items if available
      let items: EmergencyWarning['items'] = [];
      if (channel.item) {
        const itemArray = Array.isArray(channel.item) ? channel.item : [channel.item];
        items = itemArray.map((item: any) => ({
          title: item.title || '',
          description: item.description || '',
          link: item.link || '',
          pubDate: item.pubDate || ''
        }));
      }

      const result: EmergencyWarning = {
        title: channel.title || 'Emergency Warnings',
        description: channel.description || '',
        link: channel.link || '',
        lastBuildDate: channel.lastBuildDate || new Date().toISOString(),
        items
      };

      return result;
    } catch (error) {
      console.error('Failed to fetch emergency warnings RSS feed:', error);
      return null;
    }
  }

  /**
   * Get the latest warning item
   */
  static async getLatestWarning(): Promise<{
    title: string;
    description: string;
    link: string;
    pubDate: string;
  } | null> {
    const warnings = await this.fetchWarnings();
    if (warnings && warnings.items && warnings.items.length > 0) {
      return warnings.items[0];
    }
    return null;
  }
}
