/**
 * 卡片上最多展示的技术栈数量，超出部分折叠为「+N」。
 * 网格视图（ProjectCard）信息密度高，比列表视图（ProjectListItem）多展示一个，
 * 这是刻意差异——若统一成同一个值会改变两种视图的信息密度。
 */
export const TECH_VISIBLE_IN_GRID = 5;

/** 列表行上最多展示的技术栈数量，超出部分折叠为「+N」。 */
export const TECH_VISIBLE_IN_LIST = 4;
