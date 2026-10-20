window.VSRF_DIRECTORY={async load(){const r=await VSRF_API.call('/directory',undefined,'GET');return {data:r.data?.members||[],error:r.error};}};
