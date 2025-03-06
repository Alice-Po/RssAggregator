import React from 'react';
import { TextInput, required, SimpleForm } from 'react-admin';

const RssFeedForm = () => (
  <SimpleForm>
    <TextInput source="as:url" fullWidth validate={[required()]} />
  </SimpleForm>
);

export default RssFeedForm;
