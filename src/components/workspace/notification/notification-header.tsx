/* eslint-disable @typescript-eslint/no-explicit-any */

const NotificationHeader = () => {
  // const workspaceId = useWorkspaceId();

  // const { data, isPending, isError } = useQuery({
  //   queryKey: ["singleProject", projectId],
  //   queryFn: () =>
  //     getProjectByIdQueryFn({
  //       workspaceId,
  //       projectId,
  //     }),
  //   staleTime: Infinity,
  //   enabled: !!projectId,
  //   placeholderData: keepPreviousData,
  // });

  const isPending = false;
  const isError = false;

  const renderContent = () => {
    if (isPending) return <span>Loading...</span>;
    if (isError) return <span>Error occured</span>;
    return (
      <>
        {/* <span>{projectEmoji}</span>
        {projectName} */}
      </>
    );
  };
  return (
    <div className="flex items-center justify-between space-y-2">
      <h2 className="flex items-center gap-3 text-xl font-medium truncate tracking-tight">
        {renderContent()}
      </h2>
    </div>
  );
};

export default NotificationHeader;
