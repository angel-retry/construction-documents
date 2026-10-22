"""Stateless local document worker. stdin = authenticated server snapshot; stdout = ZIP.
Uses the original exporter and templates read-only. Each request has its own temp folder.
"""
import sys, json, io, zipfile, tempfile
from pathlib import Path

BASELINE = Path(__file__).resolve().parents[1] / 'baselines/20260920T151632Z/source'
sys.dont_write_bytecode = True
sys.path.insert(0, str(BASELINE))
from app.models import Project, effective_case_type, item_map
from app.kinds import get_kind
from app.catalog import ITEMS_BY_KIND
from app.exporter import (compute_site_amounts, export_log_only, export_combined_settlement,
    export_settlement_for_sites, independent_settlement_name, unallocated_targets, sites_missing_work_dates)

def generate(data):
    project = Project.from_dict(data)
    # from_dict's integer cast is legacy loading behavior, not permission to truncate cloud prices.
    project.contract_amount = float(data.get('contract_amount', 0))
    kind = get_kind(project.kind)
    items = ITEMS_BY_KIND[kind.id]
    if not any(q.quantity for q in project.quantities):
        raise ValueError('本月份尚無每日施工數量，請先填寫並儲存。')
    amounts = compute_site_amounts(project, item_map(items))
    independent = [s for s in project.sites if effective_case_type(s, amounts.get(s.site_id, 0)) == 'independent']
    normal = [s for s in project.sites if s not in independent]
    if kind.id == 'park' and (unallocated_targets(project) or sites_missing_work_dates(project, project.sites)):
        raise ValueError('公園結算尚有未分配每日數量或未填施工日期的路段，請先補齊。')
    # The original site table contains only 18 slots. Do not silently omit additional sites.
    if (kind.id == 'rainwater' and len(normal)>18) or (kind.id == 'park' and len(project.sites)>18):
        raise ValueError('本次路段超過原範本 18 列，需先確認分頁方式，避免漏列。')
    with tempfile.TemporaryDirectory(prefix='construction-excel-') as folder:
        out=Path(folder)
        paths=[export_log_only(project,kind,items,out)]
        if kind.id=='park':
            paths.append(export_combined_settlement(project,kind,items,out,normal,independent))
        else:
            if normal: paths.append(export_settlement_for_sites(project,kind,items,out,normal,project.settlement_name()))
            for site in independent:
                paths.append(export_settlement_for_sites(project,kind,items,out,[site],independent_settlement_name(project,site)))
        result=io.BytesIO()
        with zipfile.ZipFile(result,'w',zipfile.ZIP_DEFLATED) as archive:
            for file in paths: archive.write(file,file.name)
        return result.getvalue()

if __name__=='__main__':
    try: sys.stdout.buffer.write(generate(json.load(sys.stdin)))
    except ValueError as exc:
        print('USER_ERROR:'+str(exc),file=sys.stderr);sys.exit(2)
