import { ActionGroup, Button, IconButton, LinkButton, LinkIconButton, ToggleButton } from "@/components/ui";

export function ButtonSpecimen() {
  return (
    <div data-testid="button-specimen">
      <ActionGroup>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="tertiary">Tertiary</Button>
        <Button variant="danger">Danger</Button>
      </ActionGroup>
      <ActionGroup>
        <Button size="compact">Compact</Button>
        <Button>Default</Button>
        <Button size="large">Large</Button>
        <IconButton aria-label="Close">×</IconButton>
        <LinkIconButton href="/account" aria-label="Open account">
          →
        </LinkIconButton>
      </ActionGroup>
      <ActionGroup>
        <Button loading loadingLabel="Saving…">
          Save
        </Button>
        <Button disabled>Disabled</Button>
        <LinkButton href="/catalog" variant="secondary">
          Open catalog
        </LinkButton>
        <ToggleButton pressed variant="secondary" aria-label="Selected option">
          Selected
        </ToggleButton>
      </ActionGroup>
    </div>
  );
}
