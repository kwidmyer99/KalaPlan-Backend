import React, { createContext, useContext } from 'react';

export type ResContext = {};

const value: ResContext = {};

const Context = React.createContext(value);
const context = () => useContext(Context);

export default context;
