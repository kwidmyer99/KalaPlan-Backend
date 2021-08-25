const rest = async (method: string, uri: string, params?: object) => {
  const data = await fetch('/rest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ method, uri, params }),
  }).then(res => res.json());

  return data;
};

export default rest;
