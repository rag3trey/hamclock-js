"""
RSS Feed Service
Fetches and parses RSS feeds for ham radio news and content
"""

import feedparser
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
import asyncio
import aiohttp

# Popular ham radio RSS feeds
DEFAULT_FEEDS = [
    {
        'name': 'ARRL News',
        'url': 'http://www.arrl.org/news/feeds/arrl-news.xml',
        'category': 'news'
    },
    {
        'name': 'QST Magazine',
        'url': 'http://www.arrl.org/news/feeds/qst-online.xml',
        'category': 'magazine'
    },
    {
        'name': 'ARRL DX News',
        'url': 'http://www.arrl.org/news/feeds/arrl-dx-news.xml',
        'category': 'dx'
    },
    {
        'name': 'RepeaterBook Blog',
        'url': 'https://blog.repeaterbook.com/feed/',
        'category': 'repeaters'
    }
]

class RSSFeedService:
    """
    Service for fetching and managing RSS feeds
    Provides real-time ham radio news and updates
    """
    
    def __init__(self):
        self.feeds = DEFAULT_FEEDS
        self.cache = {}
        self.cache_ttl = 3600  # 1 hour cache
        self.last_fetch = {}
        
    async def fetch_feed(self, url: str, timeout: int = 10) -> Optional[Dict]:
        """
        Fetch a single RSS feed
        
        Args:
            url: URL of the RSS feed
            timeout: Timeout in seconds
            
        Returns:
            Parsed feed data or None if error
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                    if resp.status == 200:
                        content = await resp.text()
                        feed = feedparser.parse(content)
                        return feed
        except Exception as e:
            print(f"❌ Error fetching RSS feed {url}: {e}")
            return None
    
    async def get_all_feeds(self, limit: int = 50) -> List[Dict]:
        """
        Fetch all configured feeds and aggregate entries
        
        Args:
            limit: Maximum number of entries per feed
            
        Returns:
            List of feed entries sorted by date
        """
        entries = []
        
        # Fetch all feeds concurrently
        tasks = [self.fetch_feed(feed['url']) for feed in self.feeds]
        results = await asyncio.gather(*tasks)
        
        for i, feed in enumerate(results):
            if feed and hasattr(feed, 'entries'):
                for entry in feed.entries[:limit]:
                    try:
                        # Parse publication date
                        pub_date = None
                        if hasattr(entry, 'published_parsed') and entry.published_parsed:
                            pub_date = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                        elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                            pub_date = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
                        else:
                            pub_date = datetime.now(timezone.utc)
                        
                        entry_data = {
                            'title': entry.get('title', 'No title'),
                            'summary': entry.get('summary', ''),
                            'link': entry.get('link', '#'),
                            'published': pub_date.isoformat(),
                            'author': entry.get('author', 'Unknown'),
                            'source': self.feeds[i]['name'],
                            'category': self.feeds[i].get('category', 'general'),
                            'guid': entry.get('id', entry.get('link', ''))
                        }
                        entries.append(entry_data)
                    except Exception as e:
                        print(f"⚠️  Error parsing feed entry: {e}")
                        continue
        
        # Sort by publication date (newest first)
        entries.sort(key=lambda x: x['published'], reverse=True)
        
        return entries[:limit]
    
    async def get_feed_by_category(self, category: str, limit: int = 20) -> List[Dict]:
        """
        Get feed entries filtered by category
        
        Args:
            category: Feed category to filter by
            limit: Maximum number of entries
            
        Returns:
            List of matching entries
        """
        all_entries = await self.get_all_feeds(limit * 2)
        filtered = [e for e in all_entries if e.get('category') == category]
        return filtered[:limit]
    
    def add_feed(self, name: str, url: str, category: str = 'general'):
        """Add a custom feed"""
        self.feeds.append({
            'name': name,
            'url': url,
            'category': category
        })
        print(f"✅ Added feed: {name}")
    
    def remove_feed(self, name: str):
        """Remove a feed by name"""
        self.feeds = [f for f in self.feeds if f['name'] != name]
        if name in self.cache:
            del self.cache[name]
        print(f"✅ Removed feed: {name}")
    
    def get_feed_list(self) -> List[Dict]:
        """Get list of configured feeds"""
        return self.feeds


# Global instance
rss_service = RSSFeedService()
