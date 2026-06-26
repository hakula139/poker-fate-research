import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { fetchCommunityTags, voteCommunityTag } from '@/data';
import { communityTags } from '@/features/player-stats/community-tags';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { getVoterId } from '@/storage';
import type { CommunityTag, CommunityTagCount, CommunityTagVote } from '@/types';

import { labelClass } from './styles';

export function CommunityTagChips({ tags }: { tags: CommunityTagCount[] | undefined }) {
  const { t } = useI18n();
  if (!tags?.length) {
    return null;
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {tags.map(({ tag, count }) => (
        <Badge
          key={tag}
          variant="outline"
          className="min-h-6 gap-1 rounded-full border-dashed px-2.5 font-medium"
        >
          {t.communityTags[tag]}
          <span className="text-muted-foreground tabular-nums">{count}</span>
        </Badge>
      ))}
    </div>
  );
}

export function CommunityTagVoter({ uid }: { uid: number }) {
  const { t } = useI18n();
  const voterId = useMemo(() => getVoterId(), []);
  const [votes, setVotes] = useState<CommunityTagVote[] | null>(null);
  const [pending, setPending] = useState<ReadonlySet<CommunityTag>>(new Set());

  useEffect(() => {
    let aborted = false;
    void fetchCommunityTags(uid, voterId)
      .then((next) => {
        if (!aborted) {
          setVotes(next);
        }
      })
      .catch(() => {
        if (!aborted) {
          setVotes([]);
        }
      });
    return () => {
      aborted = true;
    };
  }, [uid, voterId]);

  const byTag = useMemo(() => new Map((votes ?? []).map((vote) => [vote.tag, vote])), [votes]);

  function toggle(tag: CommunityTag) {
    if (pending.has(tag)) {
      return;
    }
    const action = byTag.get(tag)?.mine ? 'remove' : 'add';
    setPending((current) => new Set(current).add(tag));
    void voteCommunityTag(uid, tag, voterId, action)
      .then((next) => {
        setVotes(next);
      })
      .catch(() => undefined)
      .finally(() => {
        setPending((current) => {
          const next = new Set(current);
          next.delete(tag);
          return next;
        });
      });
  }

  return (
    <div>
      <p className={`${labelClass} mb-2`}>{t.community.heading}</p>
      <div className="flex flex-wrap gap-1.5">
        {communityTags.map((tag) => {
          const vote = byTag.get(tag);
          const mine = vote?.mine ?? false;
          const count = vote?.count ?? 0;
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={mine}
              disabled={pending.has(tag) || votes === null}
              onClick={() => {
                toggle(tag);
              }}
              className={cn(
                'focus-visible:ring-ring/50 inline-flex min-h-6 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60',
                mine
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {t.communityTags[tag]}
              {count > 0 ? <span className="tabular-nums opacity-80">{count}</span> : null}
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground mt-2 text-xs">{t.community.hint}</p>
    </div>
  );
}
