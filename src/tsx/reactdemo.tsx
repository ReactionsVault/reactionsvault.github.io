import * as React from 'react';
import ReactDOM from 'react-dom/client';

export interface IReactDemoProps {
    value: string | undefined;
}

export class ReactDemo extends React.Component<IReactDemoProps> {
    public render(): JSX.Element {
        return <div>React: {this.props.value}</div>;
    }
}

export function Renderreact() {
    const root = ReactDOM.createRoot(document.getElementById('reactdemoroot') as HTMLElement);
    root.render(<ReactDemo value="test" />);
}
