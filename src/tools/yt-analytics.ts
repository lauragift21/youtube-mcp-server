import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props } from "../utils/upstream-utils";
import { google, youtubeAnalytics_v2 } from "googleapis";

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

  // Helper function to get channel ID for authenticated user
  const getMyChannelId = async () => {
    const youtube = getYouTubeClient();
    const response = await youtube.channels.list({
      part: ["id"],
      mine: true,
    });
    return response.data.items?.[0]?.id;
  };

  // Helper function to format dates
  const formatDate = (date: Date) => date.toISOString().split("T")[0];
  const daysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return formatDate(date);
  };

  // Tool to get channel performance overview
  // server.tool(
  //   "youtube_getChannelAnalytics",
  //   "Get comprehensive analytics for your YouTube channel including views, revenue, and subscriber growth.",
  //   {
  //     timeRange: z
  //       .enum(["7d", "30d", "90d", "currentMonth"])
  //       .default("30d")
  //       .describe("Time range for analytics data"),
  //   },
  //   async ({ timeRange }) => {
  //     try {
  //       const channelId = await getMyChannelId();
  //       if (!channelId) {
  //         throw new Error("Could not retrieve channel ID");
  //       }

  //       // Calculate date range
  //       let startDate: string, endDate: string;
  //       const today = new Date();

  //       switch (timeRange) {
  //         case "7d":
  //           startDate = daysAgo(7);
  //           endDate = daysAgo(1);
  //           break;
  //         case "30d":
  //           startDate = daysAgo(30);
  //           endDate = daysAgo(1);
  //           break;
  //         case "90d":
  //           startDate = daysAgo(90);
  //           endDate = daysAgo(1);
  //           break;
  //         case "currentMonth":
  //           startDate = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
  //           endDate = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  //           break;
  //       }

  //       const analytics = getAnalyticsClient();

  //       // Get channel analytics
  //       const response = await analytics.reports.query({
  //         ids: `channel==${channelId}`,
  //         startDate,
  //         endDate,
  //         metrics: [
  //           "views",
  //           "watchTimeMinutes",
  //           "subscribersGained",
  //           "subscribersLost",
  //           "estimatedRevenue",
  //           "likes",
  //           "comments",
  //           "shares"
  //         ].join(","),
  //         dimensions: "day",
  //         sort: "day",
  //       });

  //       // Get current channel stats
  //       const youtube = getYouTubeClient();
  //       const channelResponse = await youtube.channels.list({
  //         part: ["snippet", "statistics"],
  //         mine: true,
  //       });

  //       const channel = channelResponse.data.items?.[0];
  //       const stats = channel?.statistics;

  //       // Process analytics data
  //       const rows = response.data.rows || [];
  //       const totals = rows.reduce((acc: any, row: any[]) => {
  //         acc.views += row[1] || 0;
  //         acc.watchTimeMinutes += row[2] || 0;
  //         acc.subscribersGained += row[3] || 0;
  //         acc.subscribersLost += row[4] || 0;
  //         acc.estimatedRevenue += row[5] || 0;
  //         acc.likes += row[6] || 0;
  //         acc.comments += row[7] || 0;
  //         acc.shares += row[8] || 0;
  //         return acc;
  //       }, {
  //         views: 0,
  //         watchTimeMinutes: 0,
  //         subscribersGained: 0,
  //         subscribersLost: 0,
  //         estimatedRevenue: 0,
  //         likes: 0,
  //         comments: 0,
  //         shares: 0
  //       });

  //       const result = {
  //         timeRange,
  //         period: `${startDate} to ${endDate}`,
  //         channelInfo: {
  //           title: channel?.snippet?.title,
  //           totalSubscribers: parseInt(stats?.subscriberCount || "0"),
  //           totalViews: parseInt(stats?.viewCount || "0"),
  //           totalVideos: parseInt(stats?.videoCount || "0"),
  //         },
  //         periodAnalytics: {
  //           views: totals.views.toLocaleString(),
  //           watchTimeHours: Math.round(totals.watchTimeMinutes / 60).toLocaleString(),
  //           subscribersGained: totals.subscribersGained,
  //           subscribersLost: totals.subscribersLost,
  //           netSubscribers: totals.subscribersGained - totals.subscribersLost,
  //           estimatedRevenue: `$${totals.estimatedRevenue.toFixed(2)}`,
  //           likes: totals.likes.toLocaleString(),
  //           comments: totals.comments.toLocaleString(),
  //           shares: totals.shares.toLocaleString(),
  //           engagementRate: totals.views > 0 ?
  //             `${((totals.likes + totals.comments + totals.shares) / totals.views * 100).toFixed(2)}%` : "0%"
  //         }
  //       };

  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: `📊 **${result.channelInfo.title}** Analytics (${timeRange})\n\n` +
  //               `📈 **Current Channel Stats:**\n` +
  //               `• Subscribers: ${result.channelInfo.totalSubscribers.toLocaleString()}\n` +
  //               `• Total Views: ${result.channelInfo.totalViews.toLocaleString()}\n` +
  //               `• Total Videos: ${result.channelInfo.totalVideos.toLocaleString()}\n\n` +
  //               `📊 **Period Performance (${result.period}):**\n` +
  //               `• Views: ${result.periodAnalytics.views}\n` +
  //               `• Watch Time: ${result.periodAnalytics.watchTimeHours} hours\n` +
  //               `• Revenue: ${result.periodAnalytics.estimatedRevenue}\n` +
  //               `• Subscribers: +${result.periodAnalytics.subscribersGained} / -${result.periodAnalytics.subscribersLost} (net: ${result.periodAnalytics.netSubscribers >= 0 ? '+' : ''}${result.periodAnalytics.netSubscribers})\n` +
  //               `• Engagement: ${result.periodAnalytics.likes} likes, ${result.periodAnalytics.comments} comments, ${result.periodAnalytics.shares} shares\n` +
  //               `• Engagement Rate: ${result.periodAnalytics.engagementRate}`
  //           },
  //         ],
  //       };
  //     } catch (error: any) {
  //       console.error("Error getting channel analytics:", error);
  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: `Error getting channel analytics: ${error.message || String(error)}`,
  //           },
  //         ],
  //       };
  //     }
  //   }
  // );

  // Tool to analyze specific video performance
  // server.tool(
  //   "youtube_analyzeVideoPerformance",
  //   "Get detailed analytics for a specific video including revenue, retention, and traffic sources.",
  //   {
  //     videoId: z.string().min(1).describe("The ID of the YouTube video to analyze"),
  //     timeRange: z
  //       .enum(["7d", "30d", "90d", "lifetime"])
  //       .default("30d")
  //       .describe("Time range for analytics"),
  //   },
  //   async ({ videoId, timeRange }) => {
  //     try {
  //       // Calculate date range
  //       let startDate: string, endDate: string;

  //       if (timeRange === "lifetime") {
  //         // Get video publish date
  //         const youtube = getYouTubeClient();
  //         const videoResponse = await youtube.videos.list({
  //           part: ["snippet"],
  //           id: [videoId],
  //         });

  //         if (!videoResponse.data.items?.[0]) {
  //           throw new Error(`Video ${videoId} not found`);
  //         }

  //         startDate = videoResponse.data.items[0].snippet?.publishedAt?.split('T')[0] || daysAgo(365);
  //         endDate = daysAgo(1);
  //       } else {
  //         const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  //         startDate = daysAgo(days);
  //         endDate = daysAgo(1);
  //       }

  //       const analytics = getAnalyticsClient();

  //       // Get video analytics
  //       const response = await analytics.reports.query({
  //         ids: `video==${videoId}`,
  //         startDate,
  //         endDate,
  //         metrics: [
  //           "views",
  //           "watchTimeMinutes",
  //           "averageViewDuration",
  //           "estimatedRevenue",
  //           "likes",
  //           "comments",
  //           "shares",
  //           "subscribersGained"
  //         ].join(","),
  //         dimensions: "day",
  //         sort: "day",
  //       });

  //       // Get traffic source data
  //       const trafficResponse = await analytics.reports.query({
  //         ids: `video==${videoId}`,
  //         startDate,
  //         endDate,
  //         metrics: "views",
  //         dimensions: "insightTrafficSourceType",
  //         sort: "-views",
  //         maxResults: 10,
  //       });

  //       // Get video details
  //       const youtube = getYouTubeClient();
  //       const videoDetails = await youtube.videos.list({
  //         part: ["snippet", "statistics", "contentDetails"],
  //         id: [videoId],
  //       });

  //       const video = videoDetails.data.items?.[0];
  //       if (!video) {
  //         throw new Error(`Video ${videoId} not found`);
  //       }

  //       // Process analytics data
  //       const rows = response.data.rows || [];
  //       const totals = rows.reduce((acc: any, row: any[]) => {
  //         acc.views += row[1] || 0;
  //         acc.watchTimeMinutes += row[2] || 0;
  //         acc.averageViewDuration += row[3] || 0;
  //         acc.estimatedRevenue += row[4] || 0;
  //         acc.likes += row[5] || 0;
  //         acc.comments += row[6] || 0;
  //         acc.shares += row[7] || 0;
  //         acc.subscribersGained += row[8] || 0;
  //         acc.dataPoints += 1;
  //         return acc;
  //       }, {
  //         views: 0,
  //         watchTimeMinutes: 0,
  //         averageViewDuration: 0,
  //         estimatedRevenue: 0,
  //         likes: 0,
  //         comments: 0,
  //         shares: 0,
  //         subscribersGained: 0,
  //         dataPoints: 0
  //       });

  //       // Process traffic sources
  //       const trafficSources = (trafficResponse.data.rows || []).map((row: any[]) => ({
  //         source: row[0],
  //         views: row[1]
  //       }));

  //       const avgViewDuration = totals.dataPoints > 0 ? totals.averageViewDuration / totals.dataPoints : 0;

  //       const result = {
  //         videoInfo: {
  //           title: video.snippet?.title,
  //           publishedAt: video.snippet?.publishedAt,
  //           duration: video.contentDetails?.duration,
  //           currentStats: {
  //             views: video.statistics?.viewCount,
  //             likes: video.statistics?.likeCount,
  //             comments: video.statistics?.commentCount,
  //           }
  //         },
  //         analytics: {
  //           period: `${startDate} to ${endDate}`,
  //           views: totals.views.toLocaleString(),
  //           watchTimeHours: Math.round(totals.watchTimeMinutes / 60).toLocaleString(),
  //           averageViewDuration: `${Math.round(avgViewDuration / 60)}:${String(Math.round(avgViewDuration % 60)).padStart(2, '0')}`,
  //           estimatedRevenue: `$${totals.estimatedRevenue.toFixed(2)}`,
  //           likes: totals.likes.toLocaleString(),
  //           comments: totals.comments.toLocaleString(),
  //           shares: totals.shares.toLocaleString(),
  //           subscribersGained: totals.subscribersGained,
  //           rpm: totals.views > 0 ? `$${((totals.estimatedRevenue / totals.views) * 1000).toFixed(2)}` : "$0.00"
  //         },
  //         trafficSources: trafficSources.slice(0, 5)
  //       };

  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: `🎬 **${result.videoInfo.title}** Performance Analysis\n\n` +
  //               `📊 **Analytics (${result.analytics.period}):**\n` +
  //               `• Views: ${result.analytics.views}\n` +
  //               `• Watch Time: ${result.analytics.watchTimeHours} hours\n` +
  //               `• Avg. View Duration: ${result.analytics.averageViewDuration}\n` +
  //               `• Revenue: ${result.analytics.estimatedRevenue}\n` +
  //               `• RPM: ${result.analytics.rpm} per 1,000 views\n` +
  //               `• Engagement: ${result.analytics.likes} likes, ${result.analytics.comments} comments\n` +
  //               `• Subscribers Gained: ${result.analytics.subscribersGained}\n\n` +
  //               `🚦 **Top Traffic Sources:**\n` +
  //               result.trafficSources.map((source, i) =>
  //                 `${i + 1}. ${source.source}: ${source.views.toLocaleString()} views`).join('\n')
  //           },
  //         ],
  //       };
  //     } catch (error: any) {
  //       console.error(`Error analyzing video ${videoId}:`, error);
  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: `Error analyzing video: ${error.message || String(error)}`,
  //           },
  //         ],
  //       };
  //     }
  //   }
  // );

  // Tool to get top performing videos
  server.tool(
    "youtube_getTopVideos",
    "Get your top performing videos by views, revenue, or engagement for a specific time period.",
    {
      timeRange: z
        .enum(["7d", "30d", "90d"])
        .default("30d")
        .describe("Time range for performance analysis"),
      sortBy: z
        .enum(["views", "estimatedRevenue", "likes", "comments"])
        .default("views")
        .describe("Metric to sort videos by"),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe("Number of top videos to return"),
    },
    async ({ timeRange, sortBy, maxResults }) => {
      try {
        const channelId = await getMyChannelId();
        if (!channelId) {
          throw new Error("Could not retrieve channel ID");
        }

        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        const startDate = daysAgo(days);
        const endDate = daysAgo(1);

        const analytics = getAnalyticsClient();

        // Get video performance data
        const response = await analytics.reports.query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: [
            "views",
            "estimatedRevenue",
            "likes",
            "comments",
            "subscribersGained",
          ].join(","),
          dimensions: "video",
          sort: `-${sortBy}`,
          maxResults,
        });

        if (!response.data.rows || response.data.rows.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No video data found for the ${timeRange} period.`,
              },
            ],
          };
        }

        // Get video details for the top videos
        const videoIds = response.data.rows.map((row) => row[0]);
        const youtube = getYouTubeClient();
        const videoDetails = await youtube.videos.list({
          part: ["snippet"],
          id: videoIds,
        });

        const videoMap = new Map();
        videoDetails.data.items?.forEach((video) => {
          videoMap.set(video.id, video);
        });

        const topVideos = response.data.rows.map(
          (row: any[], index: number) => {
            const videoId = row[0];
            const video = videoMap.get(videoId);

            return {
              rank: index + 1,
              videoId,
              title: video?.snippet?.title || "Unknown Title",
              views: parseInt(row[1] || "0").toLocaleString(),
              revenue: `${(row[2] || 0).toFixed(2)}`,
              likes: parseInt(row[3] || "0").toLocaleString(),
              comments: parseInt(row[4] || "0").toLocaleString(),
              subscribersGained: row[5] || 0,
              url: `https://www.youtube.com/watch?v=${videoId}`,
            };
          }
        );

        const sortLabel =
          sortBy === "estimatedRevenue"
            ? "Revenue"
            : sortBy === "likes"
            ? "Likes"
            : "Views";

        return {
          content: [
            {
              type: "text",
              text:
                `🏆 **Top ${maxResults} Videos by ${sortLabel}** (${timeRange})\n\n` +
                topVideos
                  .map(
                    (video) =>
                      `**${video.rank}. ${video.title}**\n` +
                      `   • Views: ${video.views} | Revenue: ${video.revenue}\n` +
                      `   • Likes: ${video.likes} | Comments: ${video.comments}\n` +
                      `   • Subscribers Gained: ${video.subscribersGained}\n` +
                      `   • ${video.url}\n`
                  )
                  .join("\n"),
            },
          ],
        };
      } catch (error: any) {
        console.error("Error getting top videos:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting top videos: ${
                error.message || String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Tool to get audience demographics
  // server.tool(
  //   "youtube_getAudienceDemographics",
  //   "Get detailed audience demographics including age, gender, and geography for your channel.",
  //   {
  //     timeRange: z
  //       .enum(["30d", "90d"])
  //       .default("30d")
  //       .describe("Time range for demographic analysis"),
  //   },
  //   async ({ timeRange }) => {
  //     try {
  //       const channelId = await getMyChannelId();
  //       if (!channelId) {
  //         throw new Error("Could not retrieve channel ID");
  //       }

  //       const days = timeRange === "30d" ? 30 : 90;
  //       const startDate = daysAgo(days);
  //       const endDate = daysAgo(1);

  //       const analytics = getAnalyticsClient();

  //       // Get age group demographics
  //       const ageResponse = await analytics.reports.query({
  //         ids: `channel==${channelId}`,
  //         startDate,
  //         endDate,
  //         metrics: "viewerPercentage",
  //         dimensions: "ageGroup",
  //         sort: "-viewerPercentage",
  //       });

  //       // Get gender demographics
  //       const genderResponse = await analytics.reports.query({
  //         ids: `channel==${channelId}`,
  //         startDate,
  //         endDate,
  //         metrics: "viewerPercentage",
  //         dimensions: "gender",
  //         sort: "-viewerPercentage",
  //       });

  //       // Get top countries
  //       const countryResponse = await analytics.reports.query({
  //         ids: `channel==${channelId}`,
  //         startDate,
  //         endDate,
  //         metrics: "views",
  //         dimensions: "country",
  //         sort: "-views",
  //         maxResults: 10,
  //       });

  //       const demographics = {
  //         ageGroups: (ageResponse.data.rows || []).map((row: any[]) => ({
  //           ageGroup: row[0],
  //           percentage: `${(row[1] * 100).toFixed(1)}%`
  //         })),
  //         gender: (genderResponse.data.rows || []).map((row: any[]) => ({
  //           gender: row[0],
  //           percentage: `${(row[1] * 100).toFixed(1)}%`
  //         })),
  //         topCountries: (countryResponse.data.rows || []).map((row: any[], index: number) => ({
  //           rank: index + 1,
  //           country: row[0],
  //           views: parseInt(row[1]).toLocaleString()
  //         }))
  //       };

  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: `👥 **Audience Demographics** (${timeRange})\n\n` +
  //               `📊 **Age Distribution:**\n` +
  //               demographics.ageGroups.map(age => `• ${age.ageGroup}: ${age.percentage}`).join('\n') + '\n\n' +
  //               `⚧ **Gender Distribution:**\n` +
  //               demographics.gender.map(g => `• ${g.gender}: ${g.percentage}`).join('\n') + '\n\n' +
  //               `🌍 **Top Countries by Views:**\n` +
  //               demographics.topCountries.slice(0, 5).map(country =>
  //                 `${country.rank}. ${country.country}: ${country.views} views`).join('\n')
  //           },
  //         ],
  //       };
  //     } catch (error: any) {
  //       console.error("Error getting audience demographics:", error);
  //       return {
  //         content: [
  //           {
  //             type: "text",
  //             text: `Error getting demographics: ${error.message || String(error)}`,
  //           },
  //         ],
  //       };
  //     }
  //   }
  // );
}
