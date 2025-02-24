import React from 'react';
import { List, Datagrid, TextField, DateField, EditButton, ShowButton } from 'react-admin';

const RssFeedList = () => (
  <List sort={{ field: 'dc:created', order: 'DESC' }}>
    <Datagrid rowClick="show">
      <TextField source="apods:name" />
      <TextField source="apods:url" />
      <DateField source="dc:created" />
      <EditButton />
      <ShowButton />
    </Datagrid>
  </List>
);

export default RssFeedList;
