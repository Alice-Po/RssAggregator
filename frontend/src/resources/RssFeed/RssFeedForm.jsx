import React from 'react';
import { TextInput, required, SimpleForm } from 'react-admin';

const RssFeedForm = () => (
  <SimpleForm>
    <TextInput source="apods:name" fullWidth validate={[required()]} />
    <TextInput source="apods:url" fullWidth validate={[required()]} />
    <TextInput source="apods:description" fullWidth multiline rows={3} />
  </SimpleForm>
);

export default RssFeedForm;
