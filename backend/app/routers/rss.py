"""
RSS Feed API Routes
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..services.rss_feed import rss_service

router = APIRouter(prefix="/api/v1/rss", tags=["rss"])


@router.get("/feeds")
async def get_all_feeds(limit: int = Query(50, ge=1, le=200)):
    """
    Get all RSS feed entries from configured feeds
    
    Query Parameters:
    - limit: Maximum number of entries to return (1-200, default 50)
    """
    try:
        entries = await rss_service.get_all_feeds(limit)
        return {
            'status': 'success',
            'count': len(entries),
            'entries': entries
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching feeds: {str(e)}")


@router.get("/feeds/category/{category}")
async def get_feeds_by_category(
    category: str,
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get RSS feed entries filtered by category
    
    Path Parameters:
    - category: Feed category (news, magazine, dx, repeaters, etc.)
    
    Query Parameters:
    - limit: Maximum number of entries (1-100, default 20)
    """
    try:
        entries = await rss_service.get_feed_by_category(category, limit)
        return {
            'status': 'success',
            'category': category,
            'count': len(entries),
            'entries': entries
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching feeds: {str(e)}")


@router.get("/feeds/list")
async def get_feed_list():
    """Get list of all configured RSS feeds"""
    try:
        feeds = rss_service.get_feed_list()
        return {
            'status': 'success',
            'count': len(feeds),
            'feeds': feeds
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching feed list: {str(e)}")


@router.post("/feeds/add")
async def add_custom_feed(
    name: str = Query(..., description="Feed name"),
    url: str = Query(..., description="RSS feed URL"),
    category: str = Query("general", description="Feed category")
):
    """
    Add a custom RSS feed
    
    Query Parameters:
    - name: Name of the feed
    - url: URL to the RSS feed
    - category: Category for organizing the feed
    """
    try:
        rss_service.add_feed(name, url, category)
        return {
            'status': 'success',
            'message': f'Added feed: {name}'
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error adding feed: {str(e)}")


@router.delete("/feeds/{feed_name}")
async def remove_feed(feed_name: str):
    """
    Remove an RSS feed by name
    
    Path Parameters:
    - feed_name: Name of the feed to remove
    """
    try:
        rss_service.remove_feed(feed_name)
        return {
            'status': 'success',
            'message': f'Removed feed: {feed_name}'
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error removing feed: {str(e)}")
