import { THIN_TOPIC, TOPIC_TAGS, type TopicTag } from "../data/tags";

export type TopicCount = { topic: TopicTag; count: number };

/** Topics with fewer than THIN_TOPIC entries, in vocabulary order, with their counts. */
export function thinTopics(entries: { topic?: readonly string[] }[]): TopicCount[] {
  return (Object.keys(TOPIC_TAGS) as TopicTag[])
    .map((topic) => ({ topic, count: entries.filter((e) => e.topic?.includes(topic)).length }))
    .filter((t) => t.count < THIN_TOPIC);
}
