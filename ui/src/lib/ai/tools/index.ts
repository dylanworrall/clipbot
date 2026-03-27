import { listSpaces, createSpaceTool, getSettings } from "./workspace";
import { processVideo, getRuns, getRunDetail, getClips, cancelRun } from "./pipeline";
import { publishClip, scheduleClip, listScheduled, cancelScheduled, listPostsTool, getPostAnalytics, updatePostTool, deletePostTool, listAccountsTool, connectAccountTool, createDraftTool, generatePostsTool } from "./publishing";
import { listCreators, addCreatorTool, removeCreatorTool, checkCreatorVideos, getNotificationsTool } from "./creators";
import { autoscoreStatus, autoscoreLearn } from "./autoscore";

export const tools = [
  // Workspace & Config
  listSpaces,
  createSpaceTool,
  getSettings,
  // Pipeline
  processVideo,
  getRuns,
  getRunDetail,
  getClips,
  cancelRun,
  // Publishing & Scheduling
  publishClip,
  scheduleClip,
  listScheduled,
  cancelScheduled,
  listPostsTool,
  getPostAnalytics,
  updatePostTool,
  deletePostTool,
  listAccountsTool,
  connectAccountTool,
  createDraftTool,
  generatePostsTool,
  // Creators & Notifications
  listCreators,
  addCreatorTool,
  removeCreatorTool,
  checkCreatorVideos,
  getNotificationsTool,
  // AutoScore
  autoscoreStatus,
  autoscoreLearn,
];
