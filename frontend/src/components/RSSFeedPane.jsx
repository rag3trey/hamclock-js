import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RSSFeedPane.css';

const RSSFeedPane = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, news, magazine, dx, repeaters
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState(null);

  // Fetch RSS feeds
  const fetchFeeds = async (category = 'all') => {
    setLoading(true);
    setError(null);
    try {
      let url;
      if (category === 'all') {
        url = `http://localhost:8080/api/v1/rss/feeds?limit=${limit}`;
      } else {
        url = `http://localhost:8080/api/v1/rss/feeds/category/${category}?limit=${limit}`;
      }
      
      const response = await axios.get(url);
      setEntries(response.data.entries || []);
    } catch (err) {
      console.error('Error fetching RSS feeds:', err);
      setError('Failed to load RSS feeds');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchFeeds(filter);
  }, [filter, limit]);

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    fetchFeeds(newFilter);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Truncate text
  const truncate = (text, length = 150) => {
    if (!text) return '';
    const stripped = text.replace(/<[^>]*>/g, '');
    return stripped.length > length ? stripped.substring(0, length) + '...' : stripped;
  };

  return (
    <div className="rss-feed-pane">
      <div className="rss-header">
        <h2>📰 Ham Radio News</h2>
        <div className="rss-controls">
          <select 
            value={filter} 
            onChange={(e) => handleFilterChange(e.target.value)}
            className="rss-filter"
          >
            <option value="all">All Feeds</option>
            <option value="news">News</option>
            <option value="magazine">Magazine</option>
            <option value="dx">DX News</option>
            <option value="repeaters">Repeaters</option>
          </select>
          
          <select 
            value={limit} 
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="rss-limit"
          >
            <option value="10">10 items</option>
            <option value="20">20 items</option>
            <option value="50">50 items</option>
          </select>
          
          <button 
            onClick={() => fetchFeeds(filter)}
            className="rss-refresh"
            disabled={loading}
          >
            {loading ? '🔄' : '🔃'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rss-error">
          ❌ {error}
        </div>
      )}

      {loading && (
        <div className="rss-loading">
          Loading feeds...
        </div>
      )}

      <div className="rss-entries">
        {entries.length === 0 && !loading && (
          <div className="rss-empty">
            No feeds available
          </div>
        )}

        {entries.map((entry, index) => (
          <div key={entry.guid || index} className="rss-entry">
            <div className="rss-entry-header">
              <h3 className="rss-entry-title">
                <a href={entry.link} target="_blank" rel="noopener noreferrer">
                  {entry.title}
                </a>
              </h3>
              <span className="rss-entry-source">{entry.source}</span>
            </div>

            <div className="rss-entry-meta">
              <span className="rss-entry-date">📅 {formatDate(entry.published)}</span>
              {entry.author && entry.author !== 'Unknown' && (
                <span className="rss-entry-author">by {entry.author}</span>
              )}
              <span className="rss-entry-category">{entry.category}</span>
            </div>

            <div className="rss-entry-summary">
              {truncate(entry.summary)}
            </div>

            <div className="rss-entry-footer">
              <a 
                href={entry.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="rss-entry-link"
              >
                Read More →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RSSFeedPane;
