# 🎬 YouTube MCP Server: Remote MCP on Cloudflare Workers

A powerful Model Context Protocol (MCP) server that provides AI assistants with comprehensive YouTube analytics and channel management capabilities. Built with TypeScript, deployed on Cloudflare Workers, and secured with [Google OAuth](https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-google-oauth).

## ✨ Features

### 📊 **YouTube Analytics**
- **Channel Performance**: Revenue, views, subscriber growth, engagement metrics
- **Video Analytics**: Deep performance analysis with retention rates and traffic sources  
- **Audience Insights**: Demographics, geography, device usage, and viewing patterns
- **Top Content**: Identify best-performing videos by views, revenue, or engagement

### 🎯 **Content Strategy Tools**
- **Trending Analysis**: AI-powered content suggestions based on current trends
- **Competitor Intelligence**: Analyze competitor channels and identify content gaps
- **Performance Optimization**: Recommendations based on your channel's data

### 🔍 **YouTube Data Access**
- **Video Search**: Find videos across YouTube with advanced filtering
- **Channel Information**: Get detailed channel stats and recent uploads
- **Video Details**: Comprehensive metadata, stats, and engagement data

## 🚀 Live Demo

**Server URL**: `https://youtube-mcp-server.lauragift.workers.dev/sse`

## 🛠️ Quick Start

### Prerequisites
- YouTube channel with uploaded content
- Google Cloud Console project with YouTube APIs enabled
- Cloudflare Workers account

### 1. Clone and Install
```bash
git clone https://github.com/lauragift21/youtube-mcp-server.git
cd youtube-mcp-server
npm install
```

### 2. Configure OAuth
1. **Create Google OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable YouTube Data API v3 and YouTube Analytics API
   - Create OAuth 2.0 credentials (Web Application)
   - Add redirect URI: `https://your-worker.workers.dev/callback`

2. **Set Environment Variables**:
   ```bash
   npx wrangler secret put GOOGLE_OAUTH_CLIENT_ID
   npx wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
   npx wrangler secret put COOKIE_ENCRYPTION_KEY
   ```
You can generate a random string for `COOKIE_ENCRYPTION_KEY`

### 3. Deploy
```bash
npx wrangler deploy
```

### 4. Connect to Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "youtube-mcp-server": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-deployment.workers.dev/sse"
      ]
    }
  }
}
```

## 🔧 Available Tools

### Analytics Tools
- `youtube_getChannelAnalytics` - Get channel performance metrics
- `youtube_analyzeVideoPerformance` - Deep dive into video performance
- `youtube_getTopVideos` - Find your best-performing content
- `youtube_getAudienceDemographics` - Understand your viewers

### Content Strategy Tools  
- `youtube_suggestContentIdeas` - AI-powered topic suggestions
- `youtube_analyzeCompetitors` - Competitive analysis and benchmarking

### Data Tools
- `youtube_searchVideos` - Search YouTube with advanced filters
- `youtube_getVideoDetails` - Get comprehensive video information
- `youtube_getChannelInfo` - Channel overview and statistics
- `youtube_getChannelVideos` - Recent uploads from any channel

## 💡 Example Queries

Try these questions with Claude Desktop:

### **📈 Channel Analytics**
> *"Show me my YouTube channel performance for the past 30 days"*

### **🎯 Content Strategy**  
> *"What should I make a video about next in the AI/tech space?"*

> *"Analyze my competitors and show me content opportunities I'm missing"*

### **👥 Audience Insights**
> *"Who are my viewers? Show me demographics and geography data"*

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude Desktop │────│  MCP Server      │────│ YouTube APIs    │
│   (MCP Client)   │    │  (Cloudflare)    │    │ (Google)        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                       ┌──────────────────┐
                       │  OAuth Provider  │
                       │  (Google Auth)   │
                       └──────────────────┘
```

### Key Components
- **MCP Server**: Handles tool requests and API communication
- **OAuth Provider**: Manages Google authentication and token refresh
- **YouTube Data API**: Public video and channel information
- **YouTube Analytics API**: Private channel analytics and revenue data

## 🔗 Links

- **[Model Context Protocol](https://modelcontextprotocol.io/)** - Learn about MCP
- **[YouTube Data API](https://developers.google.com/youtube/v3)** - YouTube API documentation
- **[Cloudflare Workers](https://workers.cloudflare.com/)** - Serverless deployment platform
- **[Claude Desktop](https://claude.ai/desktop)** - AI assistant with MCP support

---

**Built with ❤️ by [Gift Egwuenu](https://github.com/lauragift21) | Powered by MCP & Cloudflare Workers**