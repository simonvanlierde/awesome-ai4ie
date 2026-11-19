import { type IeTag, THIN_TOPIC, TOPIC_TAGS, type TopicTag } from "../data/tags";

export type TopicCount = { topic: TopicTag; count: number };

type Tagged = { topic?: readonly string[]; ie?: readonly string[] };

/** Topics with fewer than THIN_TOPIC entries, in vocabulary order, with their
 * counts across the whole list. With `ie`, only the thin topics that already
 * have an entry in that field. */
export function thinTopics(entries: readonly Tagged[], ie?: IeTag): TopicCount[] {
  return (Object.keys(TOPIC_TAGS) as TopicTag[])
    .map((topic) => ({ topic, count: entries.filter((e) => e.topic?.includes(topic)).length }))
    .filter((t) => t.count < THIN_TOPIC)
    .filter((t) => !ie || entries.some((e) => e.topic?.includes(t.topic) && e.ie?.includes(ie)));
}
