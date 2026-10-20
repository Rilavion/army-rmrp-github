import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const directory = mkdtempSync(join(tmpdir(), 'vsrf-domain-'));
for (const name of ['config', 'date', 'analytics']) {
  const source = readFileSync(resolve(`frontend/supplies/lib/${name}.ts`), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/from "\.\/(.*?)"/g, 'from "./$1.mjs"').replace(/from '\.\/(.*?)'/g, "from './$1.mjs'");
  writeFileSync(join(directory, `${name}.mjs`), output);
}
const { filterSupplies, getAnalytics } = await import(pathToFileURL(join(directory, 'analytics.mjs')));
const { fromMoscowInput, formatDate, getPeriodRange } = await import(pathToFileURL(join(directory, 'date.mjs')));
const { LOCATION_CODES, ORGANIZATIONS } = await import(pathToFileURL(join(directory, 'config.mjs')));
const filters = { period: 'all', location: 'ALL', organization: 'ALL', recipient: 'ALL', status: 'ALL', from: '', to: '', search: '' };
const supply = (id, location, organizations, status = 'DELIVERED', date = '2026-10-09T12:00:00+03:00') => ({
  id, location, organizations, total: Object.values(organizations).reduce((sum,value)=>sum+value,0), status,
  recipient: 'ВС РФ', eventAt: new Date(date), comment: '', escortStatus: 'YES', trucksArrived: 2, trucksPlanned: 3,
});
const rows = [supply('1','RLS',{vs_rf:10,cgb3:2}),supply('2','VS',{vs_rf:5,fsb:3},'NOT_DELIVERED'),supply('3','OB7',{cgb7:4})];

test('All three military routes have separate totals', () => {
  const data = getAnalytics(rows);
  assert.deepEqual(data.byLocation.map(item=>[item.location,item.supplies,item.people]),[['RLS',1,12],['VS',1,8],['OB7',1,4]]);
  assert.equal(data.totalPeople,24);
  assert.ok(Math.abs(data.delivery.successRate - 200/3) < 1e-10);
});
test('Organization filter recalculates route counts and shares', () => {
  const visible = filterSupplies(rows,{...filters,organization:'vs_rf'});
  const data = getAnalytics(visible,'vs_rf');
  assert.equal(data.totalPeople,15);
  assert.equal(data.organizations.length,1);
  assert.equal(data.organizations[0].share,100);
  assert.equal(data.byLocation.find(item=>item.location==='OB7').people,0);
});
test('Route, delivery and recipient filters combine', () => {
  assert.deepEqual(filterSupplies(rows,{...filters,location:'VS',status:'NOT_DELIVERED',recipient:'ВС РФ'}).map(row=>row.id),['2']);
});
test('Custom range includes the last day and excludes next midnight', () => {
  const boundary = [supply('end','RLS',{},'DELIVERED','2026-10-09T23:59:59.999+03:00'),supply('next','VS',{},'DELIVERED','2026-10-10T00:00:00+03:00')];
  assert.deepEqual(filterSupplies(boundary,{...filters,period:'custom',from:'2026-10-09',to:'2026-10-09'}).map(row=>row.id),['end']);
});
test('Last month excludes the first instant of the current month', () => {
  const { end } = getPeriodRange('lastMonth');
  const boundary = [supply('end','RLS',{},'DELIVERED',new Date(end.getTime()-1).toISOString()),supply('next','VS',{},'DELIVERED',end.toISOString())];
  assert.deepEqual(filterSupplies(boundary,{...filters,period:'lastMonth'}).map(row=>row.id),['end']);
});
test('Search uses Moscow dates and organization names', () => {
  const boundary = supply('midnight','OB7',{fsb:3},'DELIVERED','2026-10-09T22:30:00Z');
  assert.equal(filterSupplies([boundary],{...filters,search:'10.10.2026'},true).length,1);
  assert.equal(filterSupplies([boundary],{...filters,search:'фсб'},true).length,1);
  assert.equal(filterSupplies([boundary],{...filters,search:'об-7'},true).length,1);
  assert.equal(formatDate(fromMoscowInput('2026-10-09','23:30')),'09.10.2026');
});
test('Empty dataset produces finite metrics and all route entries', () => {
  const data = getAnalytics([]);
  assert.equal(data.average,0);
  assert.equal(data.trucks.completionRate,0);
  assert.equal(data.delivery.successRate,0);
  assert.deepEqual(data.byLocation.map(item=>item.location),LOCATION_CODES);
  assert.equal(ORGANIZATIONS.length,10);
  assert.equal(new Set(ORGANIZATIONS.map(org=>org.color)).size,10);
});
