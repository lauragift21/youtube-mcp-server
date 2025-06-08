import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props } from "../utils/upstream-utils";
import { google, youtube_v3 } from "googleapis";

export function registerYouTubeTools(server: McpServer, props: Props) {
  const getYouTubeClient = () => {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: props.accessToken });
    return google.youtube({ version: "v3", auth });
  };

  // Helper to format duration from ISO 8601 to readable format
  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Tool to search for videos (your existing implementation)
  server.tool(
    "youtube_searchVideos",
    "Search for YouTube videos based on a query.",
    {
      query: z.string().min(1).describe("The search query term(s)"),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(5)
        .describe("Maximum number of results to return (1-50)"),
      order: z
        .enum([
          "date",
          "rating",
          "relevance",
          "title",
          "videoCount",
          "viewCount",
        ])
        .default("relevance")
        .describe("Sort order for results"),
      videoType: z
        .enum(["any", "episode", "movie"])
        .default("any")
        .describe("Filter by video type"),
    },
    async ({ query, maxResults, order, videoType }) => {
      try {
        const youtube = getYouTubeClient();
        const params: youtube_v3.Params$Resource$Search$List = {
          part: ["snippet"],
          q: query,
          maxResults,
          order,
          type: ["video"],
          videoType,
        };

        const response = await youtube.search.list(params);

        if (!response.data.items || response.data.items.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No YouTube videos found matching the query.",
              },
            ],
          };
        }

        const results = response.data.items.map((item) => ({
          videoId: item.id?.videoId,
          title: item.snippet?.title,
          description: item.snippet?.description,
          channelTitle: item.snippet?.channelTitle,
          publishedAt: item.snippet?.publishedAt,
          link: item.id?.videoId
            ? `https://www.youtube.com/watch?v=${item.id.videoId}`
            : "N/A",
        }));

        return {
          content: [
            {
              type: "text",
              text: `🔍 **YouTube Search Results for "${query}"**\n\n` +
                results.map((result, index) => 
                  `**${index + 1}. ${result.title}**\n` +
                  `   • Channel: ${result.channelTitle}\n` +
                  `   • Published: ${new Date(result.publishedAt || '').toLocaleDateString()}\n` +
                  `   • Video ID: ${result.videoId}\n` +
                  `   • Link: ${result.link}\n` +
                  `   • Description: ${result.description?.substring(0, 150)}...\n`
                ).join('\n')
            },
          ],
        };
      } catch (error: any) {
        console.error("Error searching YouTube videos:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error searching YouTube: ${
                error.message || String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Tool to get video details (enhanced version)
  server.tool(
    "youtube_getVideoDetails",
    "Get detailed information about a specific YouTube video.",
    {
      videoId: z.string().min(1).describe("The ID of the YouTube video"),
    },
    async ({ videoId }) => {
      try {
        const youtube = getYouTubeClient();
        const response = await youtube.videos.list({
          part: ["snippet", "contentDetails", "statistics"],
          id: [videoId],
        });

        if (!response.data.items || response.data.items.length === 0) {
          return {
            content: [
              { type: "text", text: `Video with ID ${videoId} not found.` },
            ],
          };
        }

        const video = response.data.items[0];
        const stats = video.statistics;
        const snippet = video.snippet;
        const content = video.contentDetails;

        return {
          content: [
            {
              type: "text",
              text: `🎬 **${snippet?.title}**\n\n` +
                `📊 **Performance Metrics:**\n` +
                `• Views: ${parseInt(stats?.viewCount || "0").toLocaleString()}\n` +
                `• Likes: ${parseInt(stats?.likeCount || "0").toLocaleString()}\n` +
                `• Comments: ${parseInt(stats?.commentCount || "0").toLocaleString()}\n` +
                `• Duration: ${formatDuration(content?.duration || "")}\n\n` +
                `📝 **Video Info:**\n` +
                `• Channel: ${snippet?.channelTitle}\n` +
                `• Published: ${new Date(snippet?.publishedAt || '').toLocaleDateString()}\n` +
                `• Video ID: ${videoId}\n` +
                `• Link: https://www.youtube.com/watch?v=${videoId}\n\n` +
                `📖 **Description:**\n${snippet?.description?.substring(0, 400)}...\n\n` +
                `🏷️ **Tags:** ${snippet?.tags ? snippet.tags.slice(0, 10).join(', ') : 'None'}`
            },
          ],
        };
      } catch (error: any) {
        console.error(`Error getting video details for ${videoId}:`, error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting video details: ${
                error.message || String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Tool to get channel information
  server.tool(
    "youtube_getChannelInfo",
    "Get detailed information about a YouTube channel.",
    {
      channelId: z.string().optional().describe("Channel ID (leave empty for your own channel)"),
      channelName: z.string().optional().describe("Channel name/username to search for"),
    },
    async ({ channelId, channelName }) => {
      try {
        const youtube = getYouTubeClient();
        let params: youtube_v3.Params$Resource$Channels$List;

        if (channelId) {
          params = {
            part: ["snippet", "statistics", "contentDetails"],
            id: [channelId],
          };
        } else if (channelName) {
          params = {
            part: ["snippet", "statistics", "contentDetails"],
            forUsername: channelName,
          };
        } else {
          // Get authenticated user's channel
          params = {
            part: ["snippet", "statistics", "contentDetails"],
            mine: true,
          };
        }

        const response = await youtube.channels.list(params);

        if (!response.data.items || response.data.items.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Channel not found.`,
              },
            ],
          };
        }

        const channel = response.data.items[0];
        const stats = channel.statistics;
        const snippet = channel.snippet;

        return {
          content: [
            {
              type: "text",
              text: `📺 **${snippet?.title}**\n\n` +
                `📊 **Channel Statistics:**\n` +
                `• Subscribers: ${parseInt(stats?.subscriberCount || "0").toLocaleString()}\n` +
                `• Total Views: ${parseInt(stats?.viewCount || "0").toLocaleString()}\n` +
                `• Total Videos: ${parseInt(stats?.videoCount || "0").toLocaleString()}\n\n` +
                `📝 **Channel Info:**\n` +
                `• Channel ID: ${channel.id}\n` +
                `• Created: ${new Date(snippet?.publishedAt || '').toLocaleDateString()}\n` +
                `• Country: ${snippet?.country || 'Not specified'}\n\n` +
                `📖 **Description:**\n${snippet?.description?.substring(0, 400)}...`
            },
          ],
        };
      } catch (error: any) {
        console.error("Error getting channel info:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting channel info: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Tool to get channel's recent videos
  server.tool(
    "youtube_getChannelVideos",
    "Get recent videos from a specific channel.",
    {
      channelId: z.string().optional().describe("Channel ID (leave empty for your own channel)"),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe("Number of videos to retrieve"),
      order: z
        .enum(["date", "relevance", "viewCount", "rating"])
        .default("date")
        .describe("Sort order for videos"),
    },
    async ({ channelId, maxResults, order }) => {
      try {
        const youtube = getYouTubeClient();

        // If no channelId provided, get the authenticated user's channel
        if (!channelId) {
          const channelResponse = await youtube.channels.list({
            part: ["id"],
            mine: true,
          });
          channelId = channelResponse.data.items?.[0]?.id;
          if (!channelId) {
            throw new Error("Could not retrieve channel ID");
          }
        }

        // Search for videos from the channel
        const searchResponse = await youtube.search.list({
          part: ["snippet"],
          channelId,
          type: ["video"],
          order,
          maxResults,
        });

        if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No videos found for this channel.",
              },
            ],
          };
        }

        // Get detailed video information
        const videoIds = searchResponse.data.items
          .map(item => item.id?.videoId)
          .filter(Boolean);

        const videosResponse = await youtube.videos.list({
          part: ["snippet", "statistics", "contentDetails"],
          id: videoIds,
        });

        const videos = videosResponse.data.items || [];

        return {
          content: [
            {
              type: "text",
              text: `🎥 **Recent Videos** (${videos.length} videos)\n\n` +
                videos.map((video, index) => {
                  const stats = video.statistics;
                  const snippet = video.snippet;
                  const publishedDate = new Date(snippet?.publishedAt || '').toLocaleDateString();
                  
                  return `**${index + 1}. ${snippet?.title}**\n` +
                    `   • Published: ${publishedDate}\n` +
                    `   • Views: ${parseInt(stats?.viewCount || "0").toLocaleString()}\n` +
                    `   • Likes: ${parseInt(stats?.likeCount || "0").toLocaleString()}\n` +
                    `   • Duration: ${formatDuration(video.contentDetails?.duration || "")}\n` +
                    `   • Video ID: ${video.id}\n` +
                    `   • Link: https://www.youtube.com/watch?v=${video.id}\n`;
                }).join('\n')
            },
          ],
        };
      } catch (error: any) {
        console.error("Error getting channel videos:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting channel videos: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Tool to suggest content ideas based on trending topics
  server.tool(
    "youtube_suggestContentIdeas",
    "Suggest content ideas based on trending topics in your niche or a specific topic.",
    {
      topic: z.string().min(1).describe("Topic or keyword to analyze for content ideas"),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe("Number of trending videos to analyze"),
    },
    async ({ topic, maxResults }) => {
      try {
        const youtube = getYouTubeClient();

        // Search for trending videos in the topic
        const trendingResponse = await youtube.search.list({
          part: ["snippet"],
          q: topic,
          type: ["video"],
          order: "viewCount",
          publishedAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          maxResults,
        });

        if (!trendingResponse.data.items || trendingResponse.data.items.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No trending videos found for "${topic}".`,
              },
            ],
          };
        }

        // Get video details for trending videos
        const videoIds = trendingResponse.data.items
          .map(item => item.id?.videoId)
          .filter(Boolean);

        const videosResponse = await youtube.videos.list({
          part: ["snippet", "statistics"],
          id: videoIds,
        });

        const trendingVideos = videosResponse.data.items || [];

        // Extract common keywords and themes
        const titles = trendingVideos.map(video => video.snippet?.title || '');
        const descriptions = trendingVideos.map(video => video.snippet?.description || '');
        
        // Simple keyword extraction (could be enhanced with NLP)
        const allText = [...titles, ...descriptions].join(' ').toLowerCase();
        const words = allText.match(/\b\w{4,}\b/g) || [];
        const wordCount = words.reduce((acc: Record<string, number>, word) => {
          acc[word] = (acc[word] || 0) + 1;
          return acc;
        }, {});
        
        const popularKeywords = Object.entries(wordCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([word]) => word);

        return {
          content: [
            {
              type: "text",
              text: `💡 **Content Ideas for "${topic}"**\n\n` +
                `🔥 **Trending Videos Analysis:**\n` +
                trendingVideos.slice(0, 5).map((video, index) => {
                  const views = parseInt(video.statistics?.viewCount || "0");
                  const publishedDate = new Date(video.snippet?.publishedAt || '').toLocaleDateString();
                  
                  return `${index + 1}. **${video.snippet?.title}**\n` +
                    `   • ${views.toLocaleString()} views\n` +
                    `   • Channel: ${video.snippet?.channelTitle}\n` +
                    `   • Published: ${publishedDate}\n`;
                }).join('\n') + '\n' +
                `🎯 **Popular Keywords in "${topic}":**\n` +
                popularKeywords.map(keyword => `• ${keyword}`).join('\n') + '\n\n' +
                `📝 **Content Suggestions:**\n` +
                `• "${topic} Tutorial for Beginners"\n` +
                `• "Top 10 ${topic} Tips and Tricks"\n` +
                `• "${topic} vs [Alternative] - Complete Comparison"\n` +
                `• "My Experience with ${topic} - Lessons Learned"\n` +
                `• "Common ${topic} Mistakes to Avoid"\n` +
                `• "${topic} in 2024 - What's New?"\n` +
                `• "Building/Creating with ${topic} - Step by Step"\n` +
                `• "${topic} Review - Is It Worth It?"\n`
            },
          ],
        };
      } catch (error: any) {
        console.error("Error suggesting content ideas:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error suggesting content ideas: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Tool to analyze competitors
  server.tool(
    "youtube_analyzeCompetitors",
    "Analyze competitor channels to understand their content strategy and performance.",
    {
      competitorChannelIds: z
        .array(z.string())
        .min(1)
        .max(5)
        .describe("Array of competitor channel IDs to analyze"),
      analysisDepth: z
        .enum(["basic", "detailed"])
        .default("basic")
        .describe("Level of analysis to perform"),
    },
    async ({ competitorChannelIds, analysisDepth }) => {
      try {
        const youtube = getYouTubeClient();

        const results = [];

        for (const channelId of competitorChannelIds) {
          // Get channel info
          const channelResponse = await youtube.channels.list({
            part: ["snippet", "statistics"],
            id: [channelId],
          });

          const channel = channelResponse.data.items?.[0];
          if (!channel) {
            results.push({
              channelId,
              error: "Channel not found"
            });
            continue;
          }

          let analysis: any = {
            channelId,
            title: channel.snippet?.title,
            subscribers: parseInt(channel.statistics?.subscriberCount || "0"),
            totalViews: parseInt(channel.statistics?.viewCount || "0"),
            totalVideos: parseInt(channel.statistics?.videoCount || "0"),
          };

          if (analysisDepth === "detailed") {
            // Get recent videos for more detailed analysis
            const videosResponse = await youtube.search.list({
              part: ["snippet"],
              channelId,
              type: ["video"],
              order: "date",
              maxResults: 10,
            });

            const videoIds = videosResponse.data.items
              ?.map(item => item.id?.videoId)
              .filter(Boolean) || [];

            if (videoIds.length > 0) {
              const videoDetails = await youtube.videos.list({
                part: ["snippet", "statistics"],
                id: videoIds,
              });

              const videos = videoDetails.data.items || [];
              const avgViews = videos.reduce((sum, video) => 
                sum + parseInt(video.statistics?.viewCount || "0"), 0) / videos.length;

              analysis.recentPerformance = {
                recentVideos: videos.length,
                averageViews: Math.round(avgViews),
                mostRecentVideo: videos[0]?.snippet?.title,
                uploadFrequency: "Estimated weekly" // Could calculate this properly
              };
            }
          }

          results.push(analysis);
        }

        return {
          content: [
            {
              type: "text",
              text: `🔍 **Competitor Analysis**\n\n` +
                results.map((result, index) => {
                  if (result.error) {
                    return `${index + 1}. **Channel ID: ${result.channelId}**\n   ❌ ${result.error}\n`;
                  }

                  let output = `${index + 1}. **${result.title}**\n` +
                    `   • Subscribers: ${result.subscribers.toLocaleString()}\n` +
                    `   • Total Views: ${result.totalViews.toLocaleString()}\n` +
                    `   • Total Videos: ${result.totalVideos.toLocaleString()}\n` +
                    `   • Avg Views per Video: ${Math.round(result.totalViews / result.totalVideos).toLocaleString()}\n`;

                  if (result.recentPerformance) {
                    output += `   • Recent Avg Views: ${result.recentPerformance.averageViews.toLocaleString()}\n` +
                      `   • Latest Video: "${result.recentPerformance.mostRecentVideo}"\n`;
                  }

                  return output;
                }).join('\n') + '\n' +
                `📊 **Key Insights:**\n` +
                `• Compare subscriber growth rates\n` +
                `• Analyze content themes and posting frequency\n` +
                `• Study successful video formats and titles\n` +
                `• Identify content gaps you could fill\n`
            },
          ],
        };
      } catch (error: any) {
        console.error("Error analyzing competitors:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error analyzing competitors: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}