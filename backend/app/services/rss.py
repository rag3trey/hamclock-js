"""
RSS Feed Service
Fetches and parses RSS feeds for ham radio news and updates
"""

import feedparser
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import asyncio
import aiohttp


class RSSService:
    """Service for managing and fetching RSS feeds"""
    
    def __init__(self):
        self.feeds = [
            {
                'name': 'ARRL News',
                'url': 'http://www.arrl.org/news/feed/',
                'category': 'news'
            },
            {
                'name': 'QST Blog',
                'url': 'https://www.arrl.org/qst-online-feed',
                'category': 'blog'
            },
            {
                'name': 'ARRL Contest Updates',
                'url': 'http://www.arrl.org/contest-calendar-rss',
                'category': 'contests'
            },
            {
                'name': 'DXNews',
                'url': 'http://www.dxnews.com/rss.xml',
                'category': 'dx'
            }
        ]
        self.cached_entries = {}
        self.last_update = {}
        self.cache_ttl = 3600  # 1 hour
    
    async def get_all_feeds(self) -> Dict:
        """Fetch all configured feeds"""
        all_entries = {}
        
        for feed in self.feeds:
            feed_name = feed['name']
            feed_url = feed['url']
            
            # Check cache
            if feed_name in self.cached_entries:
                last_update = self.last_update.get(feed_name, 0)
                if datetime.now(timezone.utc).timestamp() - last_update < self.cache_ttl:
                    all_entries[feed_name] = self.cached_entries[feed_name]
                    continue
            
            try:
                entries = await self._fetch_feed(feed_url, feed_name)
                all_entries[feed_name] = entries
                self.cached_entries[feed_name] = entries
                self.last_update[feed_name] = datetime.now(timezone.utc).timestamp()
            except Exception as e:
                print(f"⚠️  Error fetching {feed_name}: {e}")
                all_entries[feed_name] = []
        
        return {
            'feeds': all_entries,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'total_entries': sum(len(entries) for entries in all_entries.values())
        }
    
    async def _fetch_feed(self, feed_url: str, feed_name: str) -> List[Dict]:
        """Fetch and parse a single RSS feed"""
        try:
            # Parse the feed
            feed = feedparser.parse(feed_url)
            
            if feed.bozo:
                print(f"⚠️  Feed parse warning for {feed_name}: {feed.bozo_exception}")
            
            entries = []
            for entry in feed.entries[:10]:  # Limit to 10 most recent
                try:
                    published = entry.get('published', entry.get('updated', ''))
                    
                    # Parse date
                    try:
                        pub_date = datetime.fromisoformat(published.replace('Z', '+00:00'))
                    except:
                        pub_date = datetime.now(timezone.utc)
                    
                    entry_data = {
                        'title': entry.get('title', 'No title'),
                        'link': entry.get('link', ''),
                        'summary': entry.get('summary', entry.get('description', '')),
                        'published': pub_date.isoformat(),
                        'author': entry.get('author', ''),
                        'category': entry.get('tags', [{}])[0].get('term', 'general') if entry.get('tags') else 'general'
                    }
                    entries.append(entry_data)
                except Exception as e:
                    print(f"  Error parsing entry: {e}")
                    continue
            
            print(f"✅ Fetched {len(entries)} entries from {feed_name}")
            return entries
        
        except Exception as e:
            print(f"❌ Failed to fetch {feed_name} from {feed_url}: {e}")
            raise
    
    def get_feed_by_category(self, category: str) -> Dict:
        """Get all entries for a specific category"""
        result = {}
        
        for feed in self.feeds:
            if feed['category'] == category:
                feed_name = feed['name']
                if feed_name in self.cached_entries:
                    result[feed_name] = self.cached_entries[feed_name]
        
        return result
