"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMigrateAction } from "./migrate-button";

const DUMMY_HREF = "#";

export function MobileActionMenu({
  recordId,
  passphrase,
  content,
  isUrl,
  triggerClassName,
}: {
  recordId: string;
  passphrase: string | null;
  content: string;
  isUrl: boolean;
  triggerClassName?: string;
}) {
  const { migrate, pending } = useMigrateAction(recordId);

  const openContentUrl = () => {
    if (typeof window !== "undefined") {
      window.open(content, "_blank", "noopener,noreferrer");
    }
  };

  const openDummy = () => {
    if (typeof window !== "undefined") {
      window.location.hash = DUMMY_HREF.slice(1);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open actions menu"
        className={`${triggerClassName ?? ""} inline-flex items-center leading-none cursor-pointer outline-none`}
      >
        <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {passphrase && (
          <>
            {isUrl ? (
              <DropdownMenuItem onClick={openContentUrl} className="italic">
                {passphrase}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuLabel className="italic text-foreground">
                {passphrase}
              </DropdownMenuLabel>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={migrate} disabled={pending}>
          {pending ? "Projects…" : "Projects"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openDummy}>People</DropdownMenuItem>
        <DropdownMenuItem onClick={openDummy}>YouTube</DropdownMenuItem>
        <DropdownMenuItem onClick={openDummy}>Buy</DropdownMenuItem>
        <DropdownMenuItem onClick={openDummy}>Series</DropdownMenuItem>
        <DropdownMenuItem onClick={openDummy}>Do/Visit</DropdownMenuItem>
        <DropdownMenuItem onClick={openDummy}>Talent</DropdownMenuItem>
        <DropdownMenuItem onClick={openDummy}>Distractions (S)</DropdownMenuItem>
        <DropdownMenuItem onClick={openDummy}>Distractions (R)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
