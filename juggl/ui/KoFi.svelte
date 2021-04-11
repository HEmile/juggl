
<script>
    let button;
    var initializeKofi = () => {
        kofiwidget2.init('Support Juggl development!', '#29abe0', 'B0B23OPUE');
        button.innerHTML = kofiwidget2.getHTML();
    }
</script>

<svelte:head>
    <script type="text/javascript" src='https://ko-fi.com/widgets/widget_2.js' on:load={initializeKofi}>
    </script>
</svelte:head>
<div bind:this={button}></div>
