import React from 'react';
import { TextInput, required, SimpleForm } from 'react-admin';

const RssFeedForm = () => (
  <SimpleForm>
    <TextInput source="apods:url" fullWidth validate={[required()]} />
  </SimpleForm>
);

export default RssFeedForm;
