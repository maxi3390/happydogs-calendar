'use client';

import { Stethoscope, Phone } from 'lucide-react';
import { VetListItem } from '@/lib/api';
import { useTranslation } from '@/lib/translations';

/** One row in the Veterinary block — a clickable vet name with its phone
 *  rendered inline. The name is the click target (opens VetDetailsPopup);
 *  the phone is copy-friendly plain text so an emergency call doesn't
 *  require opening the popup at all. */
interface VetEmergencyRowProps {
  label: string;
  vet: VetListItem;
  onClick: () => void;
}

function VetEmergencyRow({ label, vet, onClick }: VetEmergencyRowProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex-shrink-0 min-w-[6.5rem]">
        {label}
      </span>
      <button
        type="button"
        onClick={onClick}
        className="text-foreground hover:text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded truncate"
      >
        {vet.name}
      </button>
      <span className="inline-flex items-center gap-1 text-muted-foreground flex-shrink-0">
        <Phone className="w-3 h-3" />
        {vet.phone ? (
          <span className="font-mono tabular-nums">{vet.phone}</span>
        ) : (
          <span className="italic">{t('vet.noPhone')}</span>
        )}
      </span>
    </div>
  );
}

interface VetEmergencyBlockProps {
  /** Primary / effective vet — the clinic to call first. Pass `null` or
   *  `undefined` to hide the row. The label string is customisable so
   *  the pet list can render "Vet" (effective) while the owner list
   *  renders "Primary vet". */
  primary?: { vet: VetListItem | null | undefined; label: string };
  /** Emergency / after-hours vet. Same rules. */
  emergency?: { vet: VetListItem | null | undefined; label: string };
  /** Called with the vet id when either row is clicked. The caller owns
   *  the `VetDetailsPopup` state and decides what to render on top. */
  onOpenVet: (vetId: number) => void;
}

/** Shared Veterinary block used by both the pet list accordion and the
 *  owner list accordion. Optimises for emergency access: the two most
 *  likely vets are shown inline with phone numbers so the operator can
 *  place a call without opening any modal. Clicking a vet name opens
 *  the VetDetailsPopup (owned by the caller) for the full record.
 *
 *  When neither vet is present the block renders nothing — the caller
 *  does not need to guard. */
export default function VetEmergencyBlock({
  primary, emergency, onOpenVet,
}: VetEmergencyBlockProps) {
  const { t } = useTranslation();
  const primaryVet = primary?.vet ?? null;
  const emergencyVet = emergency?.vet ?? null;
  if (!primaryVet && !emergencyVet) return null;

  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl space-y-2">
      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-wider flex items-center gap-1">
        <Stethoscope className="w-3 h-3" />
        {t('owner.veterinarySection')}
      </span>
      {primaryVet && (
        <VetEmergencyRow
          label={primary!.label}
          vet={primaryVet}
          onClick={() => onOpenVet(primaryVet.id)}
        />
      )}
      {emergencyVet && (
        <VetEmergencyRow
          label={emergency!.label}
          vet={emergencyVet}
          onClick={() => onOpenVet(emergencyVet.id)}
        />
      )}
    </div>
  );
}
