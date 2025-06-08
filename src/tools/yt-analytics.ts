import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props } from "../utils/upstream-utils";
import { google } from "googleapis";

export function registerYouTubeAnalyticsTools(server: McpServer, props: Props) {
  const getAnalyticsClient = () => {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: props.accessToken });
    return google.youtubeAnalytics({ version: "v2", auth });
  };

  const getYouTubeClient = () => {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: props.accessToken });
    return google.youtube({ version: "v3", auth });
  };

  // Helper functions for analytics
  const formatDate = (date: Date) => date.toISOString().split("T")[0];
  const daysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return formatDate(date);
  };

  const getMyChannelId = async () => {
    const youtube = getYouTubeClient();
    const response = await youtube.channels.list({
      part: ["id"],
      mine: true,
    });
    return response.data.items?.[0]?.id;
  };

  // Tool to get basic channel statistics
  server.tool(
    "youtube_getBasicChannelStats",
    "Get basic statistics for your YouTube channel (subscribers, views, videos).",
    {
      // No parameters needed - just gets your own channel stats
    },
    async () => {
      try {
        const youtube = getYouTubeClient();
        
        // Get channel info and statistics
        const response = await youtube.channels.list({
          part: ["snippet", "statistics"],
          mine: true,
        });

        const channel = response.data.items?.[0];
        
        if (!channel) {
          return {
            content: [
              {
                type: "text",
                text: "No YouTube channel found for this account. Please make sure you have a YouTube channel associated with your Google account.",
              },
            ],
          };
        }

        const stats = channel.statistics;
        const snippet = channel.snippet;

        const result = {
          channelName: snippet?.title || "Unknown Channel",
          channelId: channel.id,
          description: snippet?.description?.substring(0, 200) + "..." || "No description",
          publishedAt: snippet?.publishedAt || "Unknown",
          subscriberCount: parseInt(stats?.subscriberCount || "0"),
          viewCount: parseInt(stats?.viewCount || "0"),
          videoCount: parseInt(stats?.videoCount || "0"),
          thumbnailUrl: snippet?.thumbnails?.default?.url || "",
          customUrl: snippet?.customUrl || "",
          country: snippet?.country || "Not specified"
        };

        return {
          content: [
            {
              type: "text",
              text: `📺 **${result.channelName}** Channel Stats\n\n` +
                `🆔 **Channel ID:** ${result.channelId}\n` +
                `👥 **Subscribers:** ${result.subscriberCount.toLocaleString()}\n` +
                `👀 **Total Views:** ${result.viewCount.toLocaleString()}\n` +
                `🎬 **Total Videos:** ${result.videoCount.toLocaleString()}\n` +
                `📅 **Channel Created:** ${new Date(result.publishedAt).toLocaleDateString()}\n` +
                `🌍 **Country:** ${result.country}\n` +
                (result.customUrl ? `🔗 **Custom URL:** youtube.com/${result.customUrl}\n` : "") +
                `\n📝 **Description:** ${result.description}`
            },
          ],
        };
      } catch (error: any) {
        console.error("Error getting basic channel stats:", error);
        
        let errorMessage = "Error getting channel stats: ";
        if (error.message?.includes("forbidden") || error.message?.includes("403")) {
          errorMessage += "Access denied. Please ensure you're authenticated with YouTube.";
        } else if (error.message?.includes("quotaExceeded")) {
          errorMessage += "API quota exceeded. Please try again later.";
        } else {
          errorMessage += error.message || String(error);
        }
        
        return {
          content: [
            {
              type: "text",
              text: errorMessage,
            },
          ],
        };
      }
    }
  );

  // Demographics tool
  server.tool(
    "youtube_getDemographics",
    "Get basic audience demographics for your channel (age, gender, top countries).",
    {
      days: z
        .enum(["30", "90"])
        .default("30")
        .describe("Number of days to analyze (30 or 90)"),
    },
    async ({ days }) => {
      try {
        const channelId = await getMyChannelId();
        if (!channelId) {
          throw new Error("Could not retrieve channel ID");
        }

        const numDays = parseInt(days);
        const startDate = daysAgo(numDays);
        const endDate = daysAgo(1);
        
        const analytics = getAnalyticsClient();

        // Try to get each demographic separately with error handling
        let demographicsText = `👥 **Audience Demographics** (Last ${days} days)\n`;
        demographicsText += `📈 **Period:** ${startDate} to ${endDate}\n\n`;
        
        let hasAnyData = false;

        // Try age demographics
        try {
          const ageResponse = await analytics.reports.query({
            ids: `channel==${channelId}`,
            startDate,
            endDate,
            metrics: "viewerPercentage",
            dimensions: "ageGroup",
            sort: "-viewerPercentage",
          });

          if (ageResponse.data.rows && ageResponse.data.rows.length > 0) {
            demographicsText += `📊 **Age Groups:**\n`;
            ageResponse.data.rows.forEach((row: any[]) => {
              const ageGroup = row[0] || "Unknown";
              const percentage = ((row[1] || 0) * 100).toFixed(1);
              demographicsText += `• ${ageGroup}: ${percentage}%\n`;
            });
            demographicsText += '\n';
            hasAnyData = true;
          }
        } catch (error) {
          console.log("Age demographics not available:", error);
        }

        // Try gender demographics
        try {
          const genderResponse = await analytics.reports.query({
            ids: `channel==${channelId}`,
            startDate,
            endDate,
            metrics: "viewerPercentage",
            dimensions: "gender",
            sort: "-viewerPercentage",
          });

          if (genderResponse.data.rows && genderResponse.data.rows.length > 0) {
            demographicsText += `⚧ **Gender Distribution:**\n`;
            genderResponse.data.rows.forEach((row: any[]) => {
              const gender = row[0] || "Unknown";
              const percentage = ((row[1] || 0) * 100).toFixed(1);
              demographicsText += `• ${gender}: ${percentage}%\n`;
            });
            demographicsText += '\n';
            hasAnyData = true;
          }
        } catch (error) {
          console.log("Gender demographics not available:", error);
        }

        // Try top countries (this one usually works)
        try {
          const countryResponse = await analytics.reports.query({
            ids: `channel==${channelId}`,
            startDate,
            endDate,
            metrics: "views",
            dimensions: "country",
            sort: "-views",
            maxResults: 10,
          });

          if (countryResponse.data.rows && countryResponse.data.rows.length > 0) {
            demographicsText += `🌍 **Top Countries by Views:**\n`;
            countryResponse.data.rows.slice(0, 5).forEach((row: any[], index: number) => {
              const country = row[0] || "Unknown";
              const views = Number(row[1]) || 0;
              demographicsText += `${index + 1}. ${country}: ${views.toLocaleString()} views\n`;
            });
            hasAnyData = true;
          }
        } catch (error) {
          console.log("Country demographics not available:", error);
        }

        if (!hasAnyData) {
          return {
            content: [
              {
                type: "text",
                text: `No demographic data available for the last ${days} days. This could mean:\n\n` +
                  `• Your channel needs more watch time to generate demographic insights\n` +
                  `• Your audience size is too small for detailed demographics\n` +
                  `• Demographic data is still processing\n` +
                  `• Your channel may need at least 100+ hours of watch time\n\n` +
                  `💡 Try the basic analytics tool instead: youtube_getAnalytics`
              },
            ],
          };
        }

        demographicsText += `\n💡 **Note:** Demographic data requires sufficient audience size and watch time.`;

        return {
          content: [
            {
              type: "text",
              text: demographicsText,
            },
          ],
        };
      } catch (error: any) {
        console.error("Error getting demographics:", error);
        
        let errorMessage = "Error getting demographics: ";
        if (error.message?.includes("forbidden") || error.message?.includes("403")) {
          errorMessage += "Analytics access denied or insufficient permissions for demographic data.";
        } else if (error.message?.includes("quotaExceeded")) {
          errorMessage += "API quota exceeded. Please try again later.";
        } else if (error.message?.includes("badRequest")) {
          errorMessage += "Invalid request. Your channel may not have enough data for demographics.";
        } else {
          errorMessage += error.message || String(error);
        }
        
        return {
          content: [
            {
              type: "text",
              text: errorMessage,
            },
          ],
        };
      }
    }
  );

  // Analytics tool - views and subscribers over time
  server.tool(
    "youtube_getAnalytics",
    "Get basic analytics for your channel - views and subscribers for recent periods.",
    {
      days: z
        .enum(["7", "30"])
        .default("7")
        .describe("Number of days to analyze (7 or 30)"),
    },
    async ({ days }) => {
      try {
        const channelId = await getMyChannelId();
        if (!channelId) {
          throw new Error("Could not retrieve channel ID");
        }

        const numDays = parseInt(days);
        const startDate = daysAgo(numDays);
        const endDate = daysAgo(1); // Yesterday
        
        const analytics = getAnalyticsClient();

        // Start with just the most basic metrics
        const response = await analytics.reports.query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: "views,subscribersGained", // Just these two simple metrics
        });

        const rows = response.data.rows || [];
        
        if (rows.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No analytics data available for the last ${days} days. This could mean:\n• Your channel is very new\n• Not enough activity in this period\n• Analytics data is still processing`,
              },
            ],
          };
        }

        // Sum up the totals - simple and safe
        let totalViews = 0;
        let totalSubscribers = 0;
        
        rows.forEach((row: any[]) => {
          if (row[0] !== undefined && row[0] !== null) totalViews += Number(row[0]) || 0;
          if (row[1] !== undefined && row[1] !== null) totalSubscribers += Number(row[1]) || 0;
        });

        return {
          content: [
            {
              type: "text",
              text: `📊 **Simple Analytics** (Last ${days} days)\n\n` +
                `📈 **Period:** ${startDate} to ${endDate}\n` +
                `👀 **Total Views:** ${totalViews.toLocaleString()}\n` +
                `👥 **New Subscribers:** ${totalSubscribers}\n` +
                `📅 **Daily Average Views:** ${Math.round(totalViews / numDays).toLocaleString()}\n\n` +
                `💡 This is basic analytics data from YouTube Analytics API.`
            },
          ],
        };
      } catch (error: any) {
        console.error("Error getting simple analytics:", error);
        
        let errorMessage = "Error getting analytics: ";
        if (error.message?.includes("forbidden") || error.message?.includes("403")) {
          errorMessage += "Analytics access denied. Your channel may need more watch time or the Analytics API may not be enabled.";
        } else if (error.message?.includes("quotaExceeded")) {
          errorMessage += "API quota exceeded. Please try again later.";
        } else if (error.message?.includes("badRequest")) {
          errorMessage += "Invalid request. This might be due to insufficient channel data.";
        } else {
          errorMessage += error.message || String(error);
        }
        
        return {
          content: [
            {
              type: "text",
              text: errorMessage,
            },
          ],
        };
      }
    }
  );

  // Tool to get recent videos
  server.tool(
    "youtube_getMyRecentVideos",
    "Get your most recent uploaded videos with basic stats.",
    {
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(25)
        .default(10)
        .describe("Number of recent videos to retrieve"),
    },
    async ({ maxResults }) => {
      try {
        const youtube = getYouTubeClient();
        
        // First get channel ID
        const channelResponse = await youtube.channels.list({
          part: ["id"],
          mine: true,
        });

        const channelId = channelResponse.data.items?.[0]?.id;
        if (!channelId) {
          throw new Error("Could not retrieve channel ID");
        }

        // Get recent videos from the channel
        const searchResponse = await youtube.search.list({
          part: ["snippet"],
          channelId: channelId,
          order: "date",
          type: ["video"],
          maxResults: maxResults,
        });

        const videos = searchResponse.data.items || [];
        
        if (videos.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No videos found on your channel.",
              },
            ],
          };
        }

        // Get detailed stats for these videos
        const videoIds = videos.map(video => video.id?.videoId).filter(Boolean);
        const statsResponse = await youtube.videos.list({
          part: ["statistics", "contentDetails"],
          id: videoIds,
        });

        const statsMap = new Map();
        statsResponse.data.items?.forEach(video => {
          statsMap.set(video.id, {
            views: video.statistics?.viewCount || "0",
            likes: video.statistics?.likeCount || "0",
            comments: video.statistics?.commentCount || "0",
            duration: video.contentDetails?.duration || "Unknown"
          });
        });

        const recentVideos = videos.map((video, index) => {
          const videoId = video.id?.videoId || "";
          const stats = statsMap.get(videoId) || { views: "0", likes: "0", comments: "0", duration: "Unknown" };
          
          return {
            rank: index + 1,
            title: video.snippet?.title || "Unknown Title",
            videoId,
            publishedAt: video.snippet?.publishedAt || "",
            views: parseInt(stats.views).toLocaleString(),
            likes: parseInt(stats.likes).toLocaleString(),
            comments: parseInt(stats.comments).toLocaleString(),
            duration: stats.duration,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnailUrl: video.snippet?.thumbnails?.default?.url || ""
          };
        });

        return {
          content: [
            {
              type: "text",
              text: `🎬 **Your ${maxResults} Most Recent Videos**\n\n` +
                recentVideos
                  .map(video => 
                    `**${video.rank}. ${video.title}**\n` +
                    `   📅 Published: ${new Date(video.publishedAt).toLocaleDateString()}\n` +
                    `   👀 Views: ${video.views} | 👍 Likes: ${video.likes} | 💬 Comments: ${video.comments}\n` +
                    `   🔗 ${video.url}\n`
                  )
                  .join("\n"),
            },
          ],
        };
      } catch (error: any) {
        console.error("Error getting recent videos:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting recent videos: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}