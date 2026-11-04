/** Thenable query-builder stub: every chain method returns itself; awaiting (or .lean()) yields `result`. */
const chain = (result) => {
  const c = {
    populate: () => c,
    sort: () => c,
    skip: () => c,
    limit: () => c,
    select: () => c,
    lean: () => Promise.resolve(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return c;
};
module.exports = { chain };
