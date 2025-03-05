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
      <TextField source="apods:url" label="Site URL" />
      <TextField source="apods:feedUrl" label="RSS Feed URL" />
      <DateField source="dc:created" />
    </SimpleShowLayout>
  </Show>
);

export default RssFeedShow;
