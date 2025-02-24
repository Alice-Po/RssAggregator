import React from 'react';
import { Show, SimpleShowLayout, TextField, DateField, TopToolbar, EditButton } from 'react-admin';

const SubscriptionShowActions = () => (
  <TopToolbar>
    <EditButton />
  </TopToolbar>
);

const SubscriptionShow = () => (
  <Show actions={<SubscriptionShowActions />}>
    <SimpleShowLayout>
      <TextField source="apods:name" />
      <TextField source="apods:url" />
      <TextField source="apods:description" />
      <DateField source="dc:created" />
    </SimpleShowLayout>
  </Show>
);

export default SubscriptionShow;
