// src/components/charts/TopologyGraph.tsx
// D3 force-directed graph for VM cluster topology.
import { useEffect, useRef } from 'react'
import type { TopologyResponse } from '../../types'
import { TASK_TYPE_COLORS } from '../../constants'

interface Props {
    data: TopologyResponse
    width?: number
    height?: number
}

interface SimNode {
    id: string
    label: string
    task_type: string
    vm_count: number
    stats: {
        avg_efficiency: number; avg_power: number
        avg_cpu: number; avg_memory: number
        avg_compute_value: number; waste_pct: number
    }
    x: number; y: number
    fx: number | null; fy: number | null
}

interface SimLink {
    source: SimNode; target: SimNode; weight: number
}

const IBM_PLEX = 'IBM Plex Sans, system-ui, sans-serif'

export default function TopologyGraph({ data, width = 420, height = 280 }: Props) {
    const svgRef = useRef<SVGSVGElement>(null)

    useEffect(() => {
        if (!svgRef.current || !data.nodes.length) return
        let cancelled = false

        import('d3').then((d3) => {
            if (cancelled || !svgRef.current) return

            const svg = d3.select(svgRef.current)
            svg.selectAll('*').remove()

            const W = svgRef.current.clientWidth || width
            const H = svgRef.current.clientHeight || height

            const nodes: SimNode[] = data.nodes.map((n) => ({
                ...n, x: W / 2, y: H / 2, fx: null, fy: null,
            }))

            const links: SimLink[] = data.edges.map((e) => ({
                source: nodes.find((n) => n.id === e.source)!,
                target: nodes.find((n) => n.id === e.target)!,
                weight: e.weight,
            }))

            const sim = d3.forceSimulation<SimNode>(nodes)
                .force('charge', d3.forceManyBody().strength(-120))
                .force('center', d3.forceCenter(W / 2, H / 2))
                .force('link', d3.forceLink<SimNode, SimLink>(links).distance(120).strength(0.4))
                .force('collision', d3.forceCollide(52))

            const link = svg.append('g').selectAll('line')
                .data(links).join('line')
                .attr('stroke', 'rgba(240,235,227,0.10)')
                .attr('stroke-width', (d) => 1 + d.weight * 4)

            const node = svg.append('g')
                .selectAll<SVGGElement, SimNode>('g')
                .data(nodes).join('g')
                .style('cursor', 'pointer')
                .call(
                    d3.drag<SVGGElement, SimNode>()
                        .on('start', (event, d) => {
                            if (!event.active) sim.alphaTarget(0.3).restart()
                            d.fx = d.x; d.fy = d.y
                        })
                        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
                        .on('end', (event, d) => {
                            if (!event.active) sim.alphaTarget(0)
                            d.fx = null; d.fy = null
                        })
                )

            // Glow ring
            node.append('circle').attr('r', 36)
                .attr('fill', (d) => TASK_TYPE_COLORS[d.task_type] ?? '#f59e0b')
                .attr('fill-opacity', 0.1)
                .attr('stroke', (d) => TASK_TYPE_COLORS[d.task_type] ?? '#f59e0b')
                .attr('stroke-width', 1.5).attr('stroke-opacity', 0.5)

            // Inner circle
            node.append('circle').attr('r', 22)
                .attr('fill', (d) => TASK_TYPE_COLORS[d.task_type] ?? '#f59e0b')
                .attr('fill-opacity', 0.22)

            // Label
            node.append('text').text((d) => d.label)
                .attr('text-anchor', 'middle').attr('dy', '0.35em')
                .attr('fill', (d) => TASK_TYPE_COLORS[d.task_type] ?? '#fff')
                .attr('font-size', 10).attr('font-weight', 700)
                .attr('font-family', IBM_PLEX)

            // Efficiency sub-label
            node.append('text')
                .text((d) => `${(d.stats.avg_efficiency * 100).toFixed(0)}%`)
                .attr('text-anchor', 'middle').attr('dy', '1.8em')
                .attr('fill', '#a39382').attr('font-size', 9)
                .attr('font-family', 'JetBrains Mono, monospace')

            node.append('title').text((d) =>
                `${d.label}\nRecords: ${(d.vm_count / 1_000_000).toFixed(2)}M\n` +
                `Efficiency: ${(d.stats.avg_efficiency * 100).toFixed(1)}%\n` +
                `Power: ${d.stats.avg_power.toFixed(0)} W avg\nWaste: ${d.stats.waste_pct.toFixed(1)}%`
            )

            sim.on('tick', () => {
                link
                    .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
                    .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y)
                node.attr('transform', (d) => `translate(${d.x},${d.y})`)
            })
        })

        return () => { cancelled = true }
    }, [data, width, height])

    return (
        <div>
            <svg
                ref={svgRef}
                width="100%"
                height={height}
                style={{ display: 'block', overflow: 'visible' }}
            />
            {/* Legend */}
            <div style={{
                display: 'flex',
                gap: 16,
                justifyContent: 'center',
                marginTop: 6,
                paddingBottom: 4,
            }}>
                {Object.entries(TASK_TYPE_COLORS).map(([type, color]) => (
                    <span key={type} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 11, color: 'var(--text-3)',
                        fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
                    }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: color, display: 'inline-block', flexShrink: 0,
                        }} />
                        {type}
                    </span>
                ))}
            </div>
        </div>
    )
}
