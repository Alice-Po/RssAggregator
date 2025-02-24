import React from 'react';
import { Show, SimpleShowLayout, TextField, DateField, TopToolbar, EditButton } from 'react-admin';

const RssFeedShowActions = () => (
  <TopToolbar>
    <EditButton />
  </TopToolbar>
);

const RssFeedShow = () => (
  <Show actions={<RssFeedShowActions />}>
    <SimpleShowLayout>
      <TextField source="apods:name" />
      <TextField source="apods:url" />
      <TextField source="apods:description" />
      <DateField source="dc:created" />
    </SimpleShowLayout>
  </Show>
);

export default RssFeedShow;
