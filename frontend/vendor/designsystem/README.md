# Ardi design system

Create a wrapper when it captures an Ardi-specific design choice or reusable UI behavior.
Use Mantine directly for unchanged primitives, including Text, Title, layout components,
and ordinary text, password, select, checkbox, and textarea controls. Shared visual
values belong in the theme, rather than being repeated inside wrappers.

Import shared components and their prop types from `@ardi/designsystem`:

- `Button`: themed Ardi button variants with a consistent 14px loading indicator;
  supports Mantine's polymorphic `component` prop, refs, icons, and loading state.
- `IconButton`: Mantine ActionIcon with a required `aria-label`; forwards refs for
  menu and tooltip targets.
- `Dropzone`: upload icon, title, optional description, and shared spacing. Supply
  `onDrop`, `onReject`, `accept`, limits, and disabled/loading state from the app.
  Override `icon` when a different upload presentation is needed.
- `FormActions`: right-aligned actions with shared spacing; supply buttons as children.
- `FormErrorMessage`: renders a nonempty error with the error color and alert semantics.
- `DateInput`: Ardi's DD/MM/YYYY input, including automatic slash insertion and
  calendar-date validation. It preserves the existing ISO date value API.

```tsx
import { Button, Dropzone, FormActions } from '@ardi/designsystem';

<Dropzone
  title="Choose files or drag them here"
  description="Audio and video files"
  accept={['audio/*', 'video/*']}
  onDrop={onFilesSelected}
/>;

<FormActions>
  <Button variant="subtle" onClick={onCancel}>Cancel</Button>
  <Button variant="primary" loading={isSaving} onClick={onSave}>Save</Button>
</FormActions>;
```

Apps provide MantineProvider with `theme` and `cssVariablesResolver`, plus Mantine
core styles. Dropzone and date styles are included by their wrappers. App hooks
and pages own translations, form state, validation rules, network requests, and
navigation; shared components receive values and callbacks.
