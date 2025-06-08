import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Props } from "../utils/upstream-utils";
import { registerYouTubeTools } from "./youtube";
import { registerYouTubeAnalyticsTools } from "./yt-analytics";

/**
 * Registers all Google MCP tools with the server
 */
export function registerAllTools(server: McpServer, props: Props) {
  // Register individual tool categories
  registerYouTubeTools(server, props);
  registerYouTubeAnalyticsTools(server, props)
}